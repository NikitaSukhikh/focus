# PowerShell script to create a self-signed code signing certificate for test builds
# Run this as Administrator

$certName = "Focus Test Certificate"
$certPassword = "test123"  # Change this to a secure password
$pfxPath = Join-Path $PSScriptRoot "test-certificate.pfx"

Write-Host "Creating self-signed code signing certificate..." -ForegroundColor Cyan

# Create the certificate
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=$certName" `
    -KeyUsage DigitalSignature `
    -FriendlyName $certName `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
    -KeyExportPolicy Exportable `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(2)

Write-Host "Certificate created: $($cert.Thumbprint)" -ForegroundColor Green

# Export to PFX
$certPasswordSecure = ConvertTo-SecureString -String $certPassword -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $certPasswordSecure | Out-Null

Write-Host "Certificate exported to: $pfxPath" -ForegroundColor Green
Write-Host "Password: $certPassword" -ForegroundColor Yellow

# Trust the certificate (add to Trusted Root)
Write-Host "`nAdding certificate to Trusted Root Certificate Authorities..." -ForegroundColor Cyan
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$store.Open("ReadWrite")
$store.Add($cert)
$store.Close()

Write-Host "Certificate trusted successfully!" -ForegroundColor Green

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Certificate Path: $pfxPath"
Write-Host "Password: $certPassword"
Write-Host "`nAdd these to your .env file:"
Write-Host "WINDOWS_PFX_PATH=$pfxPath"
Write-Host "WINDOWS_PFX_PASSWORD=$certPassword"
