﻿using module ..\Include.psm1

class Gminer : Miner { 
    [String[]]UpdateMinerData () { 
        if ($this.GetStatus() -ne [MinerStatus]::Running) { return @() }

        $Server = "127.0.0.1"
        $Timeout = 5 #seconds

        $Request = "http://$($Server):$($this.Port)/stat"
        $Response = ""

        try { 
            if ($Global:PSVersionTable.PSVersion -ge [System.Version]("6.2.0")) { 
                $Response = Invoke-WebRequest $Request -TimeoutSec $Timeout -DisableKeepAlive -MaximumRetryCount 3 -RetryIntervalSec 1 -ErrorAction Stop
            }
            else { 
                $Response = Invoke-WebRequest $Request -UseBasicParsing -TimeoutSec $Timeout -DisableKeepAlive -ErrorAction Stop
            }
            $Data = $Response | ConvertFrom-Json -ErrorAction Stop
        }
        catch { 
            return @($Request, $Response)
        }

        $HashRate = [PSCustomObject]@{ }
        $Shares = [PSCustomObject]@{ }

        $HashRate_Name = [String]($this.Algorithm | Select-Object -Index 0)
        $Shares_Accepted = [Int]0
        $Shares_Rejected = [Int]0

        if ($this.AllowedBadShareRatio) { 
            $Shares_Accepted = ($Data.total_accepted_shares)
            $Shares_Rejected = ($Data.total_rejected_shares)
            if ((-not $Shares_Accepted -and $Shares_Rejected -ge 3) -or ($Shares_Accepted -and ($Shares_Rejected * $this.AllowedBadShareRatio -gt $Shares_Accepted))) { 
                $this.SetStatus("Failed")
                $this.StatusMessage = " was stopped because of too many bad shares for algorithm $HashRate_Name (Total: $($Shares_Accepted + $Shares_Rejected), Rejected: $Shares_Rejected [Configured allowed ratio is 1:$(1 / $this.AllowedBadShareRatio)])"
                return @($Request, $Data | ConvertTo-Json -Depth 10 -Compress)
            }
            $Shares | Add-Member @{ $HashRate_Name = @($Shares_Accepted, $Shares_Rejected, $($Shares_Accepted + $Shares_Rejected)) }
        }

        $HashRate | Add-Member @{ $HashRate_Name = [Double]($Data.devices.speed | Measure-Object -Sum).Sum }

        if ($this.Algorithm | Select-Object -Index 1) { 
            $HashRate_Name = [String]($this.Algorithm | Select-Object -Index 1)
            $HashRate_Name = "EagleSong"

            if ($this.AllowedBadShareRatio) { 
                $Shares_Accepted = [Int64]($Data.total_accepted_shares2)
                $Shares_Rejected = [Int64]($Data.total_rejected_shares2)
                if ((-not $Shares_Accepted -and $Shares_Rejected -ge 3) -or ($Shares_Accepted -and ($Shares_Rejected * $this.AllowedBadShareRatio -gt $Shares_Accepted))) { 
                    $this.SetStatus("Failed")
                    $this.StatusMessage = " was stopped because of too many bad shares for algorithm $HashRate_Name (Total: $($Shares_Accepted + $Shares_Rejected), Rejected: $Shares_Rejected [Configured allowed ratio is 1:$(1 / $this.AllowedBadShareRatio)])"
                    return @($Request, $Data | ConvertTo-Json -Depth 10 -Compress)
                }
                $Shares | Add-Member @{ $HashRate_Name = @($Shares_Accepted, $Shares_Rejected, $($Shares_Accepted + $Shares_Rejected)) }
            }
   
            $HashRate | Add-Member @{ $HashRate_Name = [Double]($Data.devices.speed2 | Measure-Object -Sum).Sum }
        }

        if ($HashRate.PSObject.Properties.Value -gt 0) { 
            $this.Data += [PSCustomObject]@{ 
                Date       = (Get-Date).ToUniversalTime()
                Raw        = $Data
                HashRate   = $HashRate
                PowerUsage = (Get-PowerUsage $this.DeviceName)
                Shares     = $Shares
                Device     = @()
            }
        }

        return @($Request, $Data | ConvertTo-Json -Depth 10 -Compress)
    }
}
