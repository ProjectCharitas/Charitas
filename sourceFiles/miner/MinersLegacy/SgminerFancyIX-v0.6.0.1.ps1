﻿using module ..\Include.psm1

param(
    [PSCustomObject]$Pools,
    [PSCustomObject]$Stats,
    [PSCustomObject]$Config,
    [PSCustomObject[]]$Devices
)
 
$Name = "$(Get-Item $MyInvocation.MyCommand.Path | Select-Object -ExpandProperty BaseName)"
$Path = ".\Bin\$($Name)\sgminer.exe"
$HashSHA256 = "653BDDE53C0F849A2049D315689D5755BECA0B001E179BF816E376D5C7C55C00"
$Uri = "https://github.com/fancyIX/sgminer-phi2-branch/releases/download/5.6.1.3.b6a/sgminer-phi2-fancyIX-win64-0.6.0.1.zip"
$ManualUri = "https://github.com/fancyIX/sgminer-phi2-branch"

$Miner_Config = Get-MinerConfig -Name $Name -Config $Config

$Commands = [PSCustomObject]@{ 
    "Allium"      = " --kernel allium --gpu-threads 1 --worksize 256 --intensity 20"
    "Argon2d"     = " --kernel argon2d --gpu-threads 2 --worksize 64"
    "Ethash"      = " --kernel ethash --worksize 64 --xintensity 1024"
    "Lyra2v3"     = " --kernel lyra2v3 --gpu-threads 1 --worksize 256 --intensity 24"
    "Lyra2z"      = " --kernel lyra2z --gpu-threads 1 --worksize 256 --intensity 23"
    "Lyra2zz"     = " --kernel lyra2zz --gpu-threads 1 --worksize 256 --intensity 23"
    #"Mtp"         = " --kernel mtp --intensity 18 -p 0,strict,verbose,d=700"; SgminerMTP is faster
    "Phi2"        = " --kernel phi2 --gpu-threads 1 --worksize 256 --intensity 23"
    "Phi2-Lux"    = " --kernel phi2 --gpu-threads 1 --worksize 256 --intensity 23" # Phi2-Lux
    "X22i"        = " --kernel x22i --gpu-threads 2 --worksize 256 --intensity 23"
    "X25x"        = " --kernel x25x --gpu-threads 4 --worksize 256 --intensity 22"
}
#Commands from config file take precedence
if ($Miner_Config.Commands) { $Miner_Config.Commands | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name | ForEach-Object { $Commands | Add-Member $_ $($Miner_Config.Commands.$_) -Force } }

#CommonCommands from config file take precedence
if ($Miner_Config.CommonCommands) { $CommonCommands = $Miner_Config.CommonCommands }
else { $CommonCommands = " $(if (-not $Config.ShowMinerWindow) { ' --text-only' })" }

$Devices = @($Devices | Where-Object Type -EQ "GPU" | Where-Object Vendor -EQ "AMD")
$Devices | Select-Object Model -Unique | ForEach-Object { 
    $Miner_Device = @($Devices | Where-Object Model -EQ $_.Model)
    $Miner_Port = [UInt16]($Config.APIPort + ($Miner_Device | Select-Object -First 1 -ExpandProperty Id) + 1)

    $Commands | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name | ForEach-Object { $Algorithm_Norm = Get-Algorithm $_; $_ } | Where-Object { $Pools.$Algorithm_Norm.Protocol -eq "stratum+tcp" <#temp fix#> } | ForEach-Object { 
        $Miner_Name = (@($Name) + @($Miner_Device.Model | Sort-Object -unique | ForEach-Object { $Model = $_; "$(@($Miner_Device | Where-Object Model -eq $Model).Count)x$Model" }) | Select-Object) -join '-'

        #Get commands for active miner devices
        $Command = Get-CommandPerDevice -Command $Commands.$_ -ExcludeParameters @("algorithm", "k", "kernel") -DeviceIDs $Miner_Device.Type_Vendor_Index

        #Allow time to build binaries
        if (-not (Get-Stat "$($Miner_Name)_$($Algorithm_Norm)_HashRate")) { $WarmupTime = 120 } else { $WarmupTime = 30 }

        if ($Algorithm_Norm -ne "Ethash" -or $Pools.$Algorithm_Norm.Name -ne "NiceHash") {  #Ethash on Nicehash does not work (Error 'Rejected untracked stratum share from daggerhashimoto.eu-new.nicehash.com')
            [PSCustomObject]@{ 
                Name        = $Miner_Name
                DeviceName  = $Miner_Device.Name
                Path        = $Path
                HashSHA256  = $HashSHA256
                Arguments   = ("$Command$CommonCommands --api-listen --api-port $Miner_Port --url $($Pools.$Algorithm_Norm.Protocol)://$($Pools.$Algorithm_Norm.Host):$($Pools.$Algorithm_Norm.Port) --user $($Pools.$Algorithm_Norm.User) --pass $($Pools.$Algorithm_Norm.Pass)$ --gpu-platform $($Miner_Device.PlatformId | Sort-Object -Unique) --device $(($Miner_Device | ForEach-Object { '{0:x}' -f $_.Type_Vendor_Index }) -join ',')" -replace "\s+", " ").trim()
                HashRates   = [PSCustomObject]@{ $Algorithm_Norm = $Stats."$($Miner_Name)_$($Algorithm_Norm)_HashRate".Week }
                API         = "Xgminer"
                Port        = $Miner_Port
                URI         = $Uri
                Environment = @("GPU_FORCE_64BIT_PTR=0")
                WarmupTime  = $WarmupTime #seconds
            }
        }
    }
}
