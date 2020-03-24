﻿using module ..\Include.psm1

param(
    [PSCustomObject]$Pools,
    [PSCustomObject]$Stats,
    [PSCustomObject]$Config,
    [PSCustomObject[]]$Devices
)

$Name = "$(Get-Item $MyInvocation.MyCommand.Path | Select-Object -ExpandProperty BaseName)"
$Path = ".\Bin\$($Name)\zm.exe"
$HashSHA256 = "1C8F4B7C252FD2C2F58F69F9D39FD89D255B9DAB1CDA4AC0BC8137EE60C383C6"
$Uri = "https://github.com/MultiPoolMiner/miner-binaries/releases/download/dstm/zm_0.6.2_win.zip"
$ManualUri = "https://bitcointalk.org/index.php?topic=2021765.0"

$Miner_Config = Get-MinerConfig -Name $Name -Config $Config

$Commands = [PSCustomObject]@{ 
    #GPU - profitable 20/04/2018
    "equihash" = "" #Equihash
}
#Commands from config file take precedence
if ($Miner_Config.Commands) { $Miner_Config.Commands | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name | ForEach-Object { $Commands | Add-Member $_ $($Miner_Config.Commands.$_) -Force } }

#CommonCommands from config file take precedence
if ($Miner_Config.CommonCommands) { $CommonCommands = $Miner_Config.CommonCommands }
else { $CommonCommands = " --color" }

$Devices = @($Devices | Where-Object Type -EQ "GPU" | Where-Object Vendor -EQ "NVIDIA")
$Devices | Select-Object Model -Unique | ForEach-Object { 
    $Miner_Device = @($Devices | Where-Object Model -EQ $_.Model)
    $Miner_Port = [UInt16]($Config.APIPort + ($Miner_Device | Select-Object -First 1 -ExpandProperty Id) + 1)

    $Commands | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name | ForEach-Object { $Algorithm_Norm = Get-Algorithm $_; $_ } | Where-Object { $Pools.$Algorithm_Norm.Host } | ForEach-Object { 
        $Miner_Name = (@($Name) + @($Miner_Device.Model | Sort-Object -unique | ForEach-Object { $Model = $_; "$(@($Miner_Device | Where-Object Model -eq $Model).Count)x$Model" }) | Select-Object) -join '-'

        #Get commands for active miner devices
        $Command = Get-CommandPerDevice -Command $Commands.$_ -DeviceIDs $Miner_Device.Type_Vendor_Index

        [PSCustomObject]@{ 
            Name       = $Miner_Name
            DeviceName = $Miner_Device.Name
            Path       = $Path
            HashSHA256 = $HashSHA256
            Arguments  = ("$Command$CommonCommands --telemetry=127.0.0.1:$($Miner_Port) --server $(if ($Pools.$Algorithm_Norm.SSL) { 'ssl://' })$($Pools.$Algorithm_Norm.Host) --port $($Pools.$Algorithm_Norm.Port) --user $($Pools.$Algorithm_Norm.User) --pass $($Pools.$Algorithm_Norm.Pass) --dev $(($Miner_Device | ForEach-Object { '{0:x}' -f ($_.Type_Vendor_Index) }) -join ' ')" -replace "\s+", " ").trim()
            HashRates  = [PSCustomObject]@{ $Algorithm_Norm = $Stats."$($Miner_Name)_$($Algorithm_Norm)_HashRate".Week }
            API        = "DSTM"
            Port       = $Miner_Port
            URI        = $Uri
            Fees       = [PSCustomObject]@{ $Algorithm_Norm = 2 / 100 }
        } 
    }
}
