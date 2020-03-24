﻿using module ..\Include.psm1

param(
    [TimeSpan]$StatSpan,
    [PSCustomObject]$Config #to be removed
)

$PoolFileName = Get-Item $MyInvocation.MyCommand.Path | Select-Object -ExpandProperty BaseName
$Wallets = $Config.Pools.$PoolFileName.Wallets #to be removed
$Worker = [String]$Config.Pools.$PoolFileName.Worker #to be removed

# Guaranteed payout currencies
$Payout_Currencies = @("BTC") | Where-Object { $Wallets.$_ }
if (-not $Payout_Currencies) { 
    Write-Log -Level Verbose "Cannot mine on pool ($PoolFileName) - no wallet address specified. "
    return
}

$PoolRegions = "eu", "jp", "na", "sea"
$PoolAPIStatusUri = "https://www.zpool.ca/api/status"
$PoolAPICurrenciesUri = "https://www.zpool.ca/api/currencies"
$RetryCount = 3
$RetryDelay = 11 # Zpool only allows 10 API request per minute (one every 10 seconds)

while (-not ($APIStatusResponse -and $APICurrenciesResponse) -and $RetryCount -gt 0) { 
    try { 
        if (-not $APIStatusResponse) { 
            $APIStatusResponse = Invoke-RestMethod $PoolAPIStatusUri -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            Start-Sleep -Seconds $RetryDelay
        }
        if (-not $APICurrenciesResponse) { $APICurrenciesResponse = Invoke-RestMethod $PoolAPICurrenciesUri -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop } 
    }
    catch { }
    if (-not ($APIStatusResponse -and $APICurrenciesResponse)) { 
        Start-Sleep -Seconds $RetryDelay
        $RetryCount--
    }
}

if (-not ($APIStatusResponse -and $APICurrenciesResponse)) { 
    Write-Log -Level Warn "Pool API ($PoolFileName) has failed. "
    return
}

if (($APIStatusResponse | Get-Member -MemberType NoteProperty -ErrorAction Ignore | Measure-Object Name).Count -lt 1) { 
    Write-Log -Level Warn "Pool API ($PoolFileName) [StatusUri] returned nothing. "
    return
}

if (($APICurrenciesResponse | Get-Member -MemberType NoteProperty -ErrorAction Ignore | Measure-Object Name).Count -lt 1) { 
    Write-Log -Level Warn "Pool API ($PoolFileName) [CurrenciesUri] returned nothing. "
    return
}

$Payout_Currencies = (@($Payout_Currencies) + @($APICurrenciesResponse | Get-Member -MemberType NoteProperty -ErrorAction Ignore | Select-Object -ExpandProperty Name)) | Where-Object { $Wallets.$_ }  | Sort-Object -Unique
if (-not $Payout_Currencies) { 
    Write-Log -Level Verbose "Cannot mine on pool ($PoolFileName) - no wallet address specified. "
    return
}

$PoolName = "$($PoolFileName)-Algo"
Write-Log -Level Verbose "Processing pool data ($PoolName). "
$APIStatusResponse | Get-Member -MemberType NoteProperty -ErrorAction Ignore | Select-Object -ExpandProperty Name | Where-Object { $APIStatusResponse.$_.hashrate -gt 0 } | Where-Object { $APIStatusResponse.$_.mbtc_mh_factor -gt 0 } | ForEach-Object {
    $PoolHost = "mine.zpool.ca"
    $Port = [Int]$APIStatusResponse.$_.port
    $Algorithm = [String]$APIStatusResponse.$_.name
    $Algorithm_Norm = ""; $CoinName = ""; $CurrencySymbol = ""
#    if ($APIStatusResponse.$_.coins -eq 1) {
        $CurrencySymbols = @($APICurrenciesResponse | Get-Member -MemberType NoteProperty -ErrorAction Ignore | Select-Object -ExpandProperty Name | Where-Object { $APICurrenciesResponse.$_.algo -eq $Algorithm })
        if ($CurrencySymbols.Count -eq 1) { 
            $CurrencySymbol = [String]($CurrencySymbols -split "-" | Select-Object -First 1)
            $Algorithm_Norm = Get-AlgorithmFromCurrencySymbol $CurrencySymbol
            $CoinName = Get-CoinName $APICurrenciesResponse.$CurrencySymbols.Name
            Switch ($CoinName) { #temp fix
                "BitCash" { $CoinName = "BitCoinCash" } 
            } 
        }
#    }
    if (-not $Algorithm_Norm) { $Algorithm_Norm = Get-Algorithm $Algorithm }
    $Workers = [Int]$APIStatusResponse.$_.workers
    $Fee = [Decimal]($APIStatusResponse.$_.Fees / 100)

    $Divisor = 1000000 <#check#> * [Double]$APIStatusResponse.$_.mbtc_mh_factor

    if ((Get-Stat -Name "$($PoolName)_$($Algorithm_Norm)_Profit") -eq $null) { $Stat = Set-Stat -Name "$($PoolName)_$($Algorithm_Norm)_Profit" -Value ($APIStatusResponse.$_.estimate_last24h / $Divisor) -Duration (New-TimeSpan -Days 1) } 
    else { $Stat = Set-Stat -Name "$($PoolName)_$($Algorithm_Norm)_Profit" -Value ($APIStatusResponse.$_.estimate_current / $Divisor) -Duration $StatSpan -ChangeDetection $true } 

    try { $EstimateCorrection = [Decimal](($APIStatusResponse.$_.actual_last24h / 1000) / $APIStatusResponse.$_.estimate_last24h) }
    catch { $EstimateCorrection = [Decimal]0 }

    $PoolRegions | ForEach-Object { 
        $Region = $_
        $Region_Norm = Get-Region $Region

        $Payout_Currencies | ForEach-Object { 
            [PSCustomObject]@{ 
                Name               = $PoolName
                Algorithm          = $Algorithm_Norm
                CoinName           = $CoinName
                CurrencySymbol     = $CurrencySymbol
                Price              = $Stat.Live
                StablePrice        = $Stat.Week
                MarginOfError      = $Stat.Week_Fluctuation
                Protocol           = "stratum+tcp"
                Host               = "$Algorithm.$Region.$PoolHost"
                Port               = $Port
                User               = [String]$Wallets.$_
                Pass               = "ID=$Worker,c=$_"
                Region             = $Region_Norm
                SSL                = $false
                Updated            = $Stat.Updated
                Fee                = $Fee
                Workers            = $Workers
                EstimateCorrection = $EstimateCorrection
            }
        }
    }
}

$PoolName = "$($PoolFileName)-Coin"
Write-Log -Level Verbose "Processing pool data ($PoolName). "
$APICurrenciesResponse | Get-Member -MemberType NoteProperty -ErrorAction Ignore | Select-Object -ExpandProperty Name | Where-Object { $APICurrenciesResponse.$_.hashrate -gt 0 }  | ForEach-Object { 
    $APICurrenciesResponse.$_ | Add-Member Symbol $_ -ErrorAction Ignore
    $Algorithm = [String]$APICurrenciesResponse.$_.algo

    # Not all algorithms are always exposed in API
    if ($APIStatusResponse.$Algorithm.mbtc_mh_factor -gt 0) { 
        $PoolHost = "mine.zpool.ca"
        $Port = [Int]$APICurrenciesResponse.$_.port
        $CoinName = Get-CoinName $APICurrenciesResponse.$_.name
        Switch ($CoinName) { #temp fix
            "BitCash" { $CoinName = "BitCoinCash" } 
        } 
        $CurrencySymbol = "$(($APICurrenciesResponse.$_.symbol | Select-Object -Index 0) -split '-' | Select-Object -Index 0)"
        $Algorithm_Norm = Get-AlgorithmFromCurrencySymbol $CurrencySymbol
        if (-not $Algorithm_Norm) { $Algorithm_Norm = Get-Algorithm $Algorithm }
        $Workers = [Int]$APICurrenciesResponse.$_.workers
        $Fee = [Decimal]($APIStatusResponse.$Algorithm.Fees / 100)

        $Divisor = 1000000 <#check#> * [Double]$APIStatusResponse.$Algorithm.mbtc_mh_factor

        $Stat = Set-Stat -Name "$($PoolName)_$($CurrencySymbol)-$($Algorithm_Norm)_Profit" -Value ($APICurrenciesResponse.$_.estimate / $Divisor) -Duration $StatSpan -ChangeDetection $true

        try { $EstimateCorrection = [Decimal](($APIStatusResponse.$Algorithm.actual_last24h / 1000) / $APIStatusResponse.$Algorithm.estimate_last24h) } 
        catch { $EstimateCorrection = [Decimal]0 }

        $PoolRegions | ForEach-Object { 
            $Region = $_
            $Region_Norm = Get-Region $Region

            $Payout_Currencies | ForEach-Object { 
                [PSCustomObject]@{ 
                    Name               = $PoolName
                    Algorithm          = $Algorithm_Norm
                    CoinName           = $CoinName
                    CurrencySymbol     = $CurrencySymbol
                    Price              = $Stat.Live
                    StablePrice        = $Stat.Week
                    MarginOfError      = $Stat.Week_Fluctuation
                    Protocol           = "stratum+tcp"
                    Host               = "$Algorithm.$Region.$PoolHost"
                    Port               = $Port
                    User               = [String]$Wallets.$_
                    Pass               = "ID=$Worker,c=$_"
                    Region             = $Region_Norm
                    SSL                = $false
                    Updated            = $Stat.Updated
                    Fee                = $Fee
                    Workers            = $Workers
                    EstimateCorrection = $EstimateCorrection
                }
            }
        }
    }
}
