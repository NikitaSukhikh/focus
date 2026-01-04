# Self-Signed Certificate for Test Builds

## Setup Instructions

### 1. Create the Certificate

Run the PowerShell script **as Administrator**:

```powershell
cd ui
.\create-test-certificate.ps1
```

This will:
- Create a self-signed code signing certificate
- Export it to `test-certificate.pfx`
- Add it to your Trusted Root Certificate Authorities
- Display the certificate path and password

### 2. Configure Environment Variables

Create a `.env` file in the `ui` folder:

```bash
cp .env.example .env
```

Update the certificate path and password in `.env`:

```env
WINDOWS_PFX_PATH=d:\ocean\ui\test-certificate.pfx
WINDOWS_PFX_PASSWORD=test123
```

### 3. Build the Application

```bash
npm run build
```

The built installer will be signed with your test certificate.

## Sharing with Friends

When sharing the installer with friends, they will see a "Unknown Publisher" warning because it's self-signed. They can:

1. **Install anyway** by clicking "More info" → "Run anyway"
2. **Trust the certificate** (recommended):
   - Right-click the installer → Properties → Digital Signatures
   - Select the signature → Details → View Certificate
   - Install Certificate → Local Machine → Place in "Trusted Root Certificate Authorities"

## Security Notes

- This certificate is for **testing only**
- Never share the `.pfx` file or password
- For production releases, use a proper code signing certificate from a Certificate Authority
- The certificate expires in 2 years

## Troubleshooting

If the script fails, ensure you're running PowerShell **as Administrator**.

If the build doesn't sign the app:
1. Check that `.env` has the correct paths
2. Verify the certificate exists: `Test-Path ui\test-certificate.pfx`
3. Check forge config reads environment variables correctly
