# Run as the Windows account that operates Astra. Research access is OS access;
# students receive only recovery codes and browser sessions.
$ErrorActionPreference = 'Stop'
$astraRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$astraIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
foreach ($astraFolder in @('.astra-data', '.astra-backups', '.astra-restored', 'grading', 'datasets', 'models', 'data', 'ml')) {
    $astraTarget = Join-Path $astraRoot $astraFolder
    if (-not (Test-Path -LiteralPath $astraTarget)) {
        if ($astraFolder -notin @('.astra-data', '.astra-backups')) { continue }
        New-Item -ItemType Directory -Path $astraTarget | Out-Null
    }
    $astraAcl = New-Object System.Security.AccessControl.DirectorySecurity
    $astraAcl.SetAccessRuleProtection($true, $false)
    foreach ($astraSid in @($astraIdentity, (New-Object System.Security.Principal.SecurityIdentifier 'S-1-5-18'), (New-Object System.Security.Principal.SecurityIdentifier 'S-1-5-32-544'))) {
        $astraRule = New-Object System.Security.AccessControl.FileSystemAccessRule($astraSid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $astraAcl.AddAccessRule($astraRule)
    }
    [System.IO.Directory]::SetAccessControl($astraTarget, $astraAcl)
    # Existing files may have explicit access grants: replace them as well.
    Get-ChildItem -LiteralPath $astraTarget -Recurse -Force | ForEach-Object {
        if ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Storage must not contain links.' }
        $astraChildAcl = if ($_.PSIsContainer) { [System.IO.Directory]::GetAccessControl(('\\?\' + $_.FullName)) } else { [System.IO.File]::GetAccessControl(('\\?\' + $_.FullName)) }
        $astraChildAcl.SetAccessRuleProtection($false, $false)
        foreach ($astraAccess in @($astraChildAcl.Access | Where-Object { -not $_.IsInherited })) { $astraChildAcl.RemoveAccessRuleSpecific($astraAccess) }
        if ($_.PSIsContainer) { [System.IO.Directory]::SetAccessControl(('\\?\' + $_.FullName), $astraChildAcl) } else { [System.IO.File]::SetAccessControl(('\\?\' + $_.FullName), $astraChildAcl) }
    }
    Write-Output "Protected $astraFolder for the Astra operator, SYSTEM and Windows administrators."
}
