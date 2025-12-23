"""
Tool Registry module for Alfy - Centralized tool management.

This module provides a type-safe, centralized registry for all tools
available to domain agents. Tools are self-describing with JSON schemas,
making them easy for LLMs to understand and use.

Benefits:
- Discoverability: Easy to see what tools exist
- Type Safety: Pydantic models validate tool definitions
- LLM Integration: Automatic JSON schema generation
- Domain Isolation: Each agent only sees its relevant tools
"""

from typing import Callable, Dict, Any, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class ParameterType(str, Enum):
    """Supported parameter types for tools."""
    STRING = "string"
    INTEGER = "integer"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class ToolParameter(BaseModel):
    """
    Definition of a tool parameter.

    This follows JSON Schema conventions for LLM compatibility.
    """
    name: str = Field(..., description="Parameter name")
    type: ParameterType = Field(..., description="Parameter type")
    description: str = Field(..., description="Human-readable description for LLM")
    required: bool = Field(default=True, description="Whether parameter is required")
    default: Optional[Any] = Field(default=None, description="Default value if not provided")
    enum: Optional[List[Any]] = Field(default=None, description="Allowed values (for enums)")

    class Config:
        use_enum_values = True


class Tool(BaseModel):
    """
    Tool definition with metadata and function reference.

    A tool is a function that an agent can call to perform an action
    (e.g., search files, send email, get balance).
    """
    name: str = Field(..., description="Unique tool identifier (e.g., 'search_files')")
    description: str = Field(..., description="What the tool does (for LLM understanding)")
    parameters: List[ToolParameter] = Field(default_factory=list, description="Tool parameters")
    function: Callable = Field(..., description="The actual Python function to execute")
    returns: str = Field(default="object", description="What the tool returns")
    domain: str = Field(..., description="Domain this tool belongs to")

    class Config:
        arbitrary_types_allowed = True  # Allow Callable type

    def to_llm_schema(self) -> Dict[str, Any]:
        """
        Convert tool definition to JSON schema for LLM function calling.

        Returns OpenAI-compatible function schema.
        """
        properties = {}
        required_params = []

        for param in self.parameters:
            properties[param.name] = {
                "type": param.type.value,
                "description": param.description,
            }

            if param.enum:
                properties[param.name]["enum"] = param.enum

            if param.required:
                required_params.append(param.name)

        schema = {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties,
            }
        }

        if required_params:
            schema["parameters"]["required"] = required_params

        return schema

    async def execute(self, **kwargs) -> Any:
        """
        Execute the tool with given arguments.

        Args:
            **kwargs: Tool-specific parameters

        Returns:
            Tool execution result
        """
        # Validate required parameters
        provided_params = set(kwargs.keys())
        required_params = {p.name for p in self.parameters if p.required}

        missing = required_params - provided_params
        if missing:
            raise ValueError(f"Missing required parameters: {missing}")

        # Apply defaults for optional parameters
        for param in self.parameters:
            if param.name not in kwargs and param.default is not None:
                kwargs[param.name] = param.default

        # Execute function (handle both sync and async)
        import asyncio
        import inspect

        if inspect.iscoroutinefunction(self.function):
            return await self.function(**kwargs)
        else:
            # Run sync function in thread pool to avoid blocking
            return await asyncio.to_thread(self.function, **kwargs)


class ToolRegistry:
    """
    Central registry for all tools in Alfy.

    Tools are organized by domain (files, email, finance, etc.) and
    can be retrieved individually or as a group for a specific domain.
    """

    def __init__(self):
        """Initialize empty tool registry."""
        self._tools: Dict[str, Tool] = {}  # Key: "domain.tool_name"
        self._domains: Dict[str, List[str]] = {}  # Key: domain, Value: list of tool names

    def register(self, tool: Tool):
        """
        Register a tool in the registry.

        Args:
            tool: Tool instance to register

        Raises:
            ValueError: If tool with same name already exists in domain
        """
        key = f"{tool.domain}.{tool.name}"

        if key in self._tools:
            raise ValueError(f"Tool '{key}' already registered")

        self._tools[key] = tool

        # Update domain index
        if tool.domain not in self._domains:
            self._domains[tool.domain] = []
        self._domains[tool.domain].append(tool.name)

    def get_tool(self, domain: str, tool_name: str) -> Optional[Tool]:
        """
        Get a specific tool by domain and name.

        Args:
            domain: Domain name (e.g., 'files')
            tool_name: Tool name (e.g., 'search_files')

        Returns:
            Tool instance or None if not found
        """
        key = f"{domain}.{tool_name}"
        return self._tools.get(key)

    def get_tools_for_domain(self, domain: str) -> List[Tool]:
        """
        Get all tools available for a specific domain.

        Args:
            domain: Domain name (e.g., 'files', 'email')

        Returns:
            List of Tool instances for that domain
        """
        if domain not in self._domains:
            return []

        tools = []
        for tool_name in self._domains[domain]:
            tool = self.get_tool(domain, tool_name)
            if tool:
                tools.append(tool)

        return tools

    def get_llm_schemas_for_domain(self, domain: str) -> List[Dict[str, Any]]:
        """
        Get LLM-compatible function schemas for a domain.

        This is used to tell the LLM what tools are available.

        Args:
            domain: Domain name

        Returns:
            List of function schemas in OpenAI format
        """
        tools = self.get_tools_for_domain(domain)
        return [tool.to_llm_schema() for tool in tools]

    def get_all_domains(self) -> List[str]:
        """
        Get list of all registered domains.

        Returns:
            List of domain names
        """
        return list(self._domains.keys())

    def get_tool_count(self, domain: Optional[str] = None) -> int:
        """
        Get count of registered tools.

        Args:
            domain: Optional domain filter

        Returns:
            Number of tools
        """
        if domain:
            return len(self._domains.get(domain, []))
        return len(self._tools)

    def list_tools(self, domain: Optional[str] = None) -> List[str]:
        """
        List all tool names.

        Args:
            domain: Optional domain filter

        Returns:
            List of "domain.tool_name" strings
        """
        if domain:
            return [f"{domain}.{name}" for name in self._domains.get(domain, [])]
        return list(self._tools.keys())

    def clear(self):
        """Clear all registered tools (useful for testing)."""
        self._tools.clear()
        self._domains.clear()


# Global registry instance
registry = ToolRegistry()


# Helper decorator for easy tool registration
def register_tool(
    domain: str,
    name: str,
    description: str,
    parameters: List[ToolParameter],
    returns: str = "object"
):
    """
    Decorator to register a function as a tool.

    Usage:
        @register_tool(
            domain="files",
            name="search_files",
            description="Search for files by name or content",
            parameters=[
                ToolParameter(name="query", type=ParameterType.STRING, description="Search query"),
                ToolParameter(name="file_type", type=ParameterType.STRING, description="File extension filter", required=False)
            ]
        )
        async def search_files(query: str, file_type: str = None):
            # Implementation
            pass
    """
    def decorator(func: Callable):
        tool = Tool(
            name=name,
            description=description,
            parameters=parameters,
            function=func,
            returns=returns,
            domain=domain
        )
        registry.register(tool)
        return func

    return decorator
