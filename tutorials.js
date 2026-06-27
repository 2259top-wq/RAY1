// Windows Server 2022 Full Series Tutorial Data
const tutorialsData = [
  {
    id: "ch1_intro",
    title: "第一章：系統介紹、版本選擇與安裝",
    description: "本章介紹 Windows Server 2022 的主要版本差異、硬體系統需求、標準安裝步驟以及伺服器初次啟動後的基礎設定。",
    checklist: [
      "確認伺服器硬體規格符合官方最低需求",
      "選擇合適的系統版本（Standard 或 Datacenter）及安裝介面（Core 或 Desktop Experience）",
      "使用 ISO/USB 隨身碟開機並完成作業系統安裝",
      "修改電腦名稱（伺服器名稱）並重啟",
      "配置固定 IPv4 位址、子網路遮罩與 DNS 伺服器",
      "啟用遠端桌面 (RDP) 功能並設定防火牆允許通過",
      "執行 Windows Update 完成安全性修補更新"
    ],
    quiz: [
      {
        question: "Windows Server 2022 的「Server Core (核心版)」和「Desktop Experience (桌面體驗版)」相比，主要優勢為何？",
        options: [
          "提供更好的 3D 繪圖運算與影音支援",
          "更低的資源佔用、更小的攻擊面、更少的安全更新頻率",
          "支援更多的 Hyper-V 虛擬主機授權",
          "支援安裝微軟 Office 辦公套件"
        ],
        correct: 1,
        explanation: "Server Core 移除了圖形介面 (GUI)，這使它耗用的記憶體與磁碟空間更小，且因為服務與組件較少，暴露的安全漏洞也大幅降低，減少了系統更新重啟的頻率。"
      },
      {
        question: "在 Windows Server 2022 中，如何使用 PowerShell 來快速將電腦名稱修改為「SRV-WEB-01」並立即重啟？",
        options: [
          "Rename-Computer -NewName 'SRV-WEB-01' -Restart",
          "Set-ComputerName -Name 'SRV-WEB-01' -Reboot",
          "Change-PCName -Name 'SRV-WEB-01' -Force",
          "New-ComputerName -Value 'SRV-WEB-01' -Action Restart"
        ],
        correct: 0,
        explanation: "在 PowerShell 中，變更電腦名稱的標準 Cmdlet 是 Rename-Computer，搭配 -Restart 參數可在變更成功後自動重新啟動系統。"
      }
    ],
    sections: [
      {
        title: "1.1 Windows Server 2022 版本與硬體需求",
        content: `### Windows Server 2022 版本說明
微軟針對不同業務規模，推出了三種主要版本：
1. **Standard (標準版)**：適合實體或輕度虛擬化環境，每個授權最多可架設 2 個虛擬作業系統環境 (OSEs / VMs)。
2. **Datacenter (資料中心版)**：專為高度虛擬化的資料中心與雲端設計，支援**阻隔限制**的虛擬主機 (VMs)，並包含 Storage Spaces Direct (S2D)、Software Defined Networking (SDN) 等進階儲存/網路技術。
3. **Essentials (基本版)**：適合 25 個使用者或 50 台裝置以下的小型企業，不需購買額外的 CAL (Client Access Licenses)。

### 硬體最低需求與自我檢核命令
在部署前，可以使用 PowerShell 快速檢測當前機器是否符合最低安裝硬體規格：
\`\`\`powershell
# 1. 檢測處理器架構與核心數
Get-CimInstance -ClassName Win32_Processor | Select-Object Name, NumberOfCores, NumberOfEnabledCore, AddressWidth

# 2. 檢測記憶體大小 (轉換為 GB 單位)
Get-CimInstance -ClassName Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum | ForEach-Object { "$([Math]::Round($_.Sum / 1GB, 2)) GB" }

# 3. 檢測硬碟磁碟空間大小
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object DeviceID, @{Name="TotalSize(GB)";Expression={[Math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[Math]::Round($_.FreeSpace/1GB,2)}}
\`\`\`

* **處理器**：1.4 GHz 64 位元處理器，相容於 x64 指令集，支援 DEP/NX、CMPXCHG16b、PrefetchW 等指令。
* **記憶體**：最少 **512 MB**（若使用 GUI 桌面體驗版，最少需要 **2 GB**，建議 4 GB 以上）。
* **硬碟空間**：最少 **32 GB**（建議 60 GB 以上以預留更新與分頁檔空間）。
* **網路卡**：至少 1 Gbps 的乙太網路卡。`
      },
      {
        title: "1.2 系統安裝與初始化設定",
        content: `### 系統安裝引導
1. 將 Windows Server 2022 安裝隨身碟或 ISO 掛載至伺服器。
2. 啟動並進入安裝介面，設定語言（通常為中文-台灣）與鍵盤輸入法。
3. 點選 **「立即安裝」**。
4. **選擇版本**：
   * 若需要滑鼠與視窗操作，請務必選擇帶有 **(桌面體驗) / (Desktop Experience)** 的選項。
   * 否則系統會預設安裝無 GUI 的 **Server Core** 介面。
5. 接受授權條款，選擇 **「自訂：僅安裝 Windows (進階)」**，點選目標硬碟並分割，點選下一步開始安裝。
6. 安裝完成重啟後，設定系統管理員 \`Administrator\` 的複雜密碼。

### 初始化實務：複製貼上指令設定
完成安裝後，請以系統管理員身分開啟 PowerShell，直接複製並修改以下區塊以完成初始設定：

\`\`\`powershell
# ==================== 1. 變更電腦名稱 ====================
$NewName = "SRV-DC-01"
Rename-Computer -NewName $NewName -Force

# ==================== 2. 設定靜態 IP 位址 ====================
# 自動尋找目前連線中的實體網卡 (狀態為 Up 且有硬體介面)
$Adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface } | Select-Object -First 1
$Index = $Adapter.InterfaceIndex

$IPAddress = "192.168.1.10"
$Prefix = 24  # 代表子網路遮罩 255.255.255.0
$Gateway = "192.168.1.1"
$DNS = @("192.168.1.10", "8.8.8.8") # 以自己為 primary，外部 DNS 為 secondary

# 設定 IP 與 Gateway
New-NetIPAddress -InterfaceIndex $Index -IPAddress $IPAddress -PrefixLength $Prefix -DefaultGateway $Gateway -Force
# 設定 DNS
Set-DnsClientServerAddress -InterfaceIndex $Index -ServerAddresses $DNS

# ==================== 3. 啟用遠端桌面 (RDP) 與防火牆 ====================
# 允許 RDP 連線
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name "fDenyTSConnections" -Value 0
# 啟用網路層級驗證 (NLA) 以加強安全性 (0 為關閉，1 為啟用)
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp' -Name "UserAuthentication" -Value 1
# 允許防火牆通過
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

# ==================== 4. 開啟 ICMP Ping 允許檢測連線 ====================
Enable-NetFirewallRule -DisplayName "檔案及印表機共用 (回應要求 - ICMPv4-In)"

# ==================== 5. 重啟系統套用新電腦名稱 ====================
Write-Host "設定完成！伺服器將在 5 秒後重新啟動..." -ForegroundColor Green
Start-Sleep -Seconds 5
Restart-Computer
\`\`\``
      }
    ]
  },
  {
    id: "ch2_ad_ds",
    title: "第二章：Active Directory 網域服務 (AD DS) 部署",
    description: "學習網域控制器 (Domain Controller) 的基本概念、安裝 AD DS 角色、將伺服器升級為網域主機，以及 OU、使用者、群組管理。",
    checklist: [
      "確認本機伺服器已設定固定 IP 與電腦名稱",
      "使用伺服器管理員安裝 Active Directory 網域服務角色",
      "將伺服器升級為新樹系 (Forest) 中的第一台網域控制站 (DC)",
      "設定 DSRM (目錄服務還原模式) 密碼並完成升級重啟",
      "使用 AD 管理中心或 AD 使用者與電腦 (ADUC) 規劃組織單位 (OU) 結構",
      "建立測試網域使用者與安全性群組",
      "將用戶端 Windows 10/11 電記加入該 AD 網域"
    ],
    quiz: [
      {
        question: "在部署第一個 AD DS 網域控制站時，為什麼系統會要求設定 DSRM 密碼？",
        options: [
          "這是為了之後變更 Administrator 登入密碼用的",
          "在 Active Directory 資料庫損壞需要進入還原模式修復時，用於還原模式的管理者密碼",
          "這是用來登入網域內一般用戶端電腦的預設密碼",
          "用於備份網路共用資料夾的加密金鑰"
        ],
        correct: 1,
        explanation: "DSRM (Directory Services Restore Mode) 密碼是當 AD 發生嚴重故障，伺服器必須以還原模式開機時使用的專屬系統管理密碼，與一般的網域 Administrator 密碼是分開的。"
      },
      {
        question: "在 AD 網域中，以下哪一種群組類型可以用於跨網域分配資源權限，且可以包含來自任何網域的成員？",
        options: [
          "網域本機群組 (Domain Local Group)",
          "全域群組 (Global Group)",
          "通用群組 (Universal Group)",
          "發佈群組 (Distribution Group)"
        ],
        correct: 2,
        explanation: "通用群組 (Universal Group) 的成員身分會被寫入通用類別目錄 (Global Catalog)，它可包含任何網域中的帳戶或群組，並可套用至任何網域的權限中。通常遵循 AGUDLP 原則（帳戶加入全域，全域放入通用，通用放本機，本機指派權限）。"
      }
    ],
    sections: [
      {
        title: "2.1 Active Directory 核心架構概念",
        content: `### 什麼是 Active Directory 網域服務 (AD DS)？
Active Directory 是微軟的核心目錄服務，用於在 Windows 網路環境中集中管理使用者帳戶、電腦、伺服器、印表機及權限。

### AD 的階層化結構
1. **樹系 (Forest)**：AD 結構中的最高層級邊界，一個樹系可以包含一個或多個網域樹狀目錄，它們共享同一個「綱要 (Schema)」與「通用類別目錄 (Global Catalog)」。
2. **網域 (Domain)**：安全與管理上的邊界，共用同一個帳戶資料庫與安全性原則。例如 \`corp.contoso.com\`。
3. **組織單位 (OU, Organizational Unit)**：網域內的邏輯容器，用於存放使用者、群組、電腦等物件。管理員可以將「群組原則 (GPO)」套用至 OU，或將 OU 的管理權限委派給特定的技術人員。
4. **網域控制站 (DC, Domain Controller)**：負責保存 AD 目錄資料庫，並處理網域內使用者的登入驗證（採用 Kerberos v5 協定）與授權。`
      },
      {
        title: "2.2 部署網域控制器實務",
        content: `### 一鍵安裝 AD DS 角色與建立新樹系
請將以下 PowerShell 指令完整複製，並在欲升級為 DC 的伺服器上執行。這會自動安裝 AD DS 角色並將伺服器升級為全新樹系的第一台 Domain Controller（以網域 \`lab.local\` 為例）：

\`\`\`powershell
# ==================== 1. 安裝 AD DS 角色與管理工具 ====================
Write-Host "正在安裝 AD DS 角色功能..." -ForegroundColor Cyan
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# ==================== 2. 部署新樹系與 DC ====================
# -DomainName: 網域的 FQDN 名稱
# -DomainNetbiosName: 網域的短名稱 (通常為大寫主域名)
# -SafeModeAdministratorPassword: 目錄服務還原模式 (DSRM) 密碼

$DomainName = "lab.local"
$NetBIOSName = "LAB"
$DSRMPassword = ConvertTo-SecureString "P@ssw0rd999!" -AsPlainText -Force

Write-Host "正在啟動 Active Directory 新樹系設定..." -ForegroundColor Cyan
Import-Module ADDSDeployment

Install-ADDSForest \
  -CreateDnsDelegation:$false \
  -DatabasePath "C:\\Windows\\NTDS" \
  -DomainMode "WinThreshold" \
  -DomainName $DomainName \
  -DomainNetbiosName $NetBIOSName \
  -ForestMode "WinThreshold" \
  -InstallDns:$true \
  -LogPath "C:\\Windows\\NTDS" \
  -NoRebootOnCompletion:$false \
  -SysVolPath "C:\\Windows\\SYSVOL" \
  -SafeModeAdministratorPassword $DSRMPassword \
  -Force:$true
\`\`\``
      },
      {
        title: "2.3 帳戶、群組與 OU 常用管理指令",
        content: `### AD 基礎維護常用 PowerShell 指令
部署完網域後，管理員可以複製以下常用維護腳本進行批次作業：

\`\`\`powershell
# ==================== 1. 建立組織單位 (OU) ====================
# 在網域根目錄下建立 "Taipei" 總 OU，並在其下建立 "Users" 及 "Groups" 子 OU
$DomainDN = (Get-ADDomain).DistinguishedName
New-ADOrganizationalUnit -Name "Taipei" -Path $DomainDN
New-ADOrganizationalUnit -Name "Users" -Path "OU=Taipei,$DomainDN"
New-ADOrganizationalUnit -Name "Groups" -Path "OU=Taipei,$DomainDN"

# ==================== 2. 新增使用者帳戶 ====================
$UserOU = "OU=Users,OU=Taipei,$DomainDN"
$Password = ConvertTo-SecureString "TempP@ss123" -AsPlainText -Force

# 新增使用者「王大明 (damon.wang)」並設定下次登入必須修改密碼
New-ADUser -Name "王大明" \
           -SamAccountName "damon.wang" \
           -UserPrincipalName "damon.wang@lab.local" \
           -Path $UserOU \
           -AccountPassword $Password \
           -Enabled $true \
           -ChangePasswordAtLogon $true \
           -Title "系統工程師" \
           -Department "IT部門"

# ==================== 3. 建立安全性群組 ====================
$GroupOU = "OU=Groups,OU=Taipei,$DomainDN"
New-ADGroup -Name "GG-IT-Staff" -GroupScope Global -GroupCategory Security -Path $GroupOU

# ==================== 4. 將使用者加入群組 ====================
Add-ADGroupMember -Identity "GG-IT-Staff" -Members "damon.wang"

# ==================== 5. 將用戶端主機加入網域 ====================
# (此指令需在用戶端電腦上以系統管理員身分執行，執行後需重啟)
# Add-Computer -DomainName "lab.local" -Credential (Get-Credential) -Restart
\`\`\``
      }
    ]
  },
  {
    id: "ch3_dns_dhcp",
    title: "第三章：DNS 與 DHCP 基礎網路服務架設",
    description: "深入了解 DNS 解析原理、主機名稱與 IP 對應，以及 DHCP 自動發送 IP 位址、租期與保留區設定。",
    checklist: [
      "在 DC 伺服器上驗證 DNS 角色是否已自動啟用並運作",
      "建立 DNS 反向對應區域 (Reverse Lookup Zone) 以支援 IP 查主機名",
      "設定 DNS 轉寄站 (Forwarders) 指向 ISP 或公共 DNS (如 8.8.8.8)",
      "在網域中安裝 DHCP 伺服器角色",
      "在 Active Directory 中「授權」此 DHCP 伺服器",
      "建立 IPv4 領域 (Scope) 並設定租期、閘道器與 DNS 參數",
      "建立用戶端固定 Mac 位址的 IP 保留區 (Reservation)"
    ],
    quiz: [
      {
        question: "在 Windows Server 中設定 DHCP 伺服器時，若要讓它能正常為網域內用戶端派發 IP，必須在 AD 中執行哪項重要動作？",
        options: [
          "將 DHCP 伺服器帳戶加入 Domain Admins 群組",
          "在 Active Directory 中將 DHCP 伺服器進行「授權 (Authorize)」",
          "關閉 DHCP 伺服器的 Windows 防火牆",
          "將 DHCP 的資料庫檔案上傳至 SYSVOL 共用資料夾"
        ],
        correct: 1,
        explanation: "為了防止未授權的偽冒 DHCP 伺服器（Rogue DHCP）在網域內亂發 IP 造成網路混亂，AD 網域中的 DHCP 必須經過網域管理員「授權」才能啟用服務。"
      },
      {
        question: "DNS 中的「A 記錄」與「CNAME 記錄」主要差異為何？",
        options: [
          "A 記錄對應 IPv6，CNAME 對應 IPv4",
          "A 記錄將主機名稱解析為實體 IP 位址，而 CNAME 是將主機別名對應到另一個主機名稱",
          "A 記錄是用於電子郵件路由，CNAME 用於網頁伺服器",
          "A 記錄由 DHCP 自動建立，CNAME 必須由系統管理員手動建立"
        ],
        correct: 1,
        explanation: "A (Host) 記錄負責將主機名指向指定的 IPv4 位址。CNAME (Canonical Name) 則是別名記錄，允許將多個名字指向同一個主要的 A 記錄域名。"
      }
    ],
    sections: [
      {
        title: "3.1 DNS 服務架設與解析機制",
        content: `### DNS 常用管理與解析設定
DNS (Domain Name System) 負責解析域名與 IP 的對應關係。

\`\`\`powershell
# ==================== 1. 新增反向解析區域 ====================
# 以本機網段 192.168.1.0/24 為例，新增反向解析區域
Add-DnsServerPrimaryZone -NetworkId "192.168.1.0/24" -ReplicationScope Forest

# ==================== 2. 設定 DNS 轉寄站 ====================
# 當網域內主機查詢外部網路時，交給公共 DNS (如 Google/Cloudflare) 轉寄解析
Set-DnsServerForwarder -IPAddress @("8.8.8.8", "1.1.1.1") -PassThru

# ==================== 3. 新增主機記錄 (A Record) ====================
# 將 srv-web 指向 192.168.1.80
Add-DnsServerResourceRecordA -Name "srv-web" -ZoneName "lab.local" -IPv4Address "192.168.1.80" -CreatePtr

# ==================== 4. 新增別名記錄 (CNAME) ====================
# 將 www.lab.local 指向 srv-web.lab.local
Add-DnsServerResourceRecordCName -Name "www" -ZoneName "lab.local" -HostNameAlias "srv-web.lab.local"

# ==================== 5. 新增郵件交換記錄 (MX) ====================
# 設定網域內郵件路由優先權為 10，指向 mail.lab.local
Add-DnsServerResourceRecordMX -Name "@" -ZoneName "lab.local" -MailExchange "mail.lab.local" -Preference 10
\`\`\``
      },
      {
        title: "3.2 DHCP 角色部署與配置指南",
        content: `### DHCP 伺服器部署與作用域配置
DHCP 用於集中並自動發放 IP 地址給局域網中的用戶端。

\`\`\`powershell
# ==================== 1. 安裝 DHCP 角色功能 ====================
Write-Host "安裝 DHCP 角色..." -ForegroundColor Cyan
Install-WindowsFeature -Name DHCP -IncludeManagementTools

# ==================== 2. 在 Active Directory 中授權 DHCP 伺服器 ====================
# (必須在網域 DC 或有網域系統管理員權限之主機上執行)
$DCName = (Get-ADDomainController).HostName
$DCIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and -not $_.IPAddress.StartsWith('169.254') })[0].IPAddress
Add-DhcpServerInDC -DnsName $DCName -IPAddress $DCIP

# ==================== 3. 建立網段作用域 (Scope) ====================
# 建立名為 "Office-LAN" 的 Scope，範圍 192.168.1.100 - 192.168.1.200，子網 24 位元
$ScopeName = "Office-LAN"
$ScopeIP = "192.168.1.0"
Add-DhcpServerv4Scope -Name $ScopeName -StartRange "192.168.1.100" -EndRange "192.168.1.200" -SubnetMask "255.255.255.0" -State Active

# ==================== 4. 配置 Scope 選項參數 ====================
# 設定 Option 003: 預設閘道 (Gateway)
Set-DhcpServerv4OptionValue -ScopeId $ScopeIP -OptionId 3 -Value "192.168.1.1"
# 設定 Option 006: DNS 伺服器指向 DC 本身
Set-DhcpServerv4OptionValue -ScopeId $ScopeIP -OptionId 6 -Value $DCIP
# 設定 Option 015: 網域名稱
Set-DhcpServerv4OptionValue -ScopeId $ScopeIP -OptionId 15 -Value "lab.local"

# ==================== 5. 設定特定設備的 IP 保留區 ====================
# 依據 MAC 位址 "00-15-5d-01-02-03" 固定指派 IP "192.168.1.150"
Add-DhcpServerv4Reservation -ScopeId $ScopeIP -IPAddress "192.168.1.150" -ClientId "00-15-5d-01-02-03" -Name "OfficePrinter" -Description "HR Printer Reservation"
\`\`\``
      }
    ]
  },
  {
    id: "ch4_gpo",
    title: "第四章：群組原則物件 (GPO) 管理與安全性設定",
    description: "學習群組原則的繼承關係、套用順序，並實作軟體部署、硬碟對應、桌面限制與強化安全性。",
    checklist: [
      "開啟群組原則管理主控台 (gpmc.msc)",
      "了解 LSDOU 原則與群組原則的優先權順序",
      "建立一個測試 GPO 並將其連結 (Link) 到特定的組織單位 (OU)",
      "實作「限制控制台存取」或「限制命令提示字元」原則",
      "使用 GPO 喜好設定 (Preferences) 實作自動連線網路磁碟機",
      "實作防火牆規則與本機安全性帳戶鎖定原則",
      "使用 gpupdate /force 在用戶端強制更新並用 gpresult /h 產生報告"
    ],
    quiz: [
      {
        question: "群組原則的套用順序為「本機 (Local) -> 站台 (Site) -> 網域 (Domain) -> 組織單位 (OU)」。如果同一個設定在網域層級被設定為「停用」，在組織單位 (OU) 被設定為「啟用」，且沒有任何強制或封鎖設定，最後的套用結果會是什麼？",
        options: [
          "停用",
          "啟用",
          "兩者衝突，該原則失效不套用",
          "由系統管理員手動決定"
        ],
        correct: 1,
        explanation: "群組原則的套用順序是 LSDOU。後套用的設定會覆蓋先套用的設定。因此，OU 層級（最後套用）的「啟用」設定會覆蓋網域層級（較早套用）的「停用」設定。"
      },
      {
        question: "在用戶端電腦上，如果想要立刻套用並同步剛在 DC 上修改過的 GPO 原則，應執行什麼命令？",
        options: [
          "gpresult /r",
          "gplink -refresh",
          "gpupdate /force",
          "ipconfig /flushdns"
        ],
        correct: 2,
        explanation: "gpupdate /force 命令會強迫用戶端電腦向 DC 拉取最新的群組原則物件設定並立刻套用，而不需要等待預設的 90-120 分鐘背景重新整理間告。"
      }
    ],
    sections: [
      {
        title: "4.1 GPO 機制與繼承關係",
        content: `### GPO (Group Policy Object) 機制與運作
GPO 是管理網域使用者和電腦組態的核心。

### 繼承與覆蓋優先順序 (LSDOU)
* **L**ocal $\\rightarrow$ **S**ite $\\rightarrow$ **D**omain $\\rightarrow$ **O**U
* **繼承覆蓋**：後套用者覆蓋前套用者。套用在 OU 上的 GPO，其設定優先權高於套用在 Domain 上的 GPO。
* **強制套用 (Enforced)**：在父階 GPO 設定「強制」，可防止子 OU 覆蓋該原則。
* **繼承封鎖 (Block Inheritance)**：子 OU 可設定封鎖，不接受任何父階 GPO（除強制外）。
* **更新頻率**：網域主機預設每 90~120 分鐘背景整理一次。管理員可在客戶端電腦執行強制指令立即重新整理：
  \`\`\`cmd
  gpupdate /force
  \`\`\`
* **產生 GPO 診斷報告**：
  \`\`\`cmd
  # 以 HTML 格式生成該電腦套用的完整 GPO 報告
  gpresult /h gpreport.html
  \`\`\``
      },
      {
        title: "4.2 常用 GPO 實務配置案例",
        content: `### 實務 GPO 的 PowerShell 自動化配置
除了使用 \`gpmc.msc\` 圖形工具手動設定，管理員可使用 \`GroupPolicy\` 模組自動建立與連結 GPO：

\`\`\`powershell
# ==================== 1. 建立並連結 GPO 至特定 OU ====================
Import-Module GroupPolicy

$GPOName = "GPO-BlockUSB-and-CMD"
$TargetOU = "OU=Users,OU=Taipei,DC=lab,DC=local"

# 建立 GPO
$NewGPO = New-GPO -Name $GPOName
# 連結 GPO 到台北 Users OU
New-GPLink -Name $GPOName -Target $TargetOU

# ==================== 2. 實作本機密碼原則與安全性鎖定 ====================
# 匯出安全配置範本
secedit /export /cfg C:\\temp\\sec.cfg

# 編輯 sec.cfg 設定密碼最短長度為 10 位，連續輸入錯 5 次鎖定 30 分鐘：
# [System Access]
# MinimumPasswordLength = 10
# PasswordComplexity = 1
# LockoutBadCount = 5
# LockoutDuration = 30

# 重新導入並套用安全原則
# secedit /configure /db C:\\windows\\security\\database\\secedit.sdb /cfg C:\\temp\\sec.cfg /areas SECURITYPOLICY

# ==================== 3. 用 GPO 喜好設定派發登錄檔阻擋 USB (電腦配置) ====================
# 設定阻擋隨身碟 (Registry Key: HKLM\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR -> Start 改為 4)
Set-GPRegistryValue -Name $GPOName \
                    -Key "HKLM\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR" \
                    -ValueName "Start" \
                    -Type DWord \
                    -Value 4
\`\`\``
      }
    ]
  },
  {
    id: "ch5_file_storage",
    title: "第五章：檔案與儲存服務 (Share, NTFS & FSRM)",
    description: "精通共用資料夾權限與 NTFS 權限的加總計算、使用 FSRM 限制容量與檔案格式，以及 DFS 分散式檔案系統部署。",
    checklist: [
      "在新磁碟區建立共用資料夾，並區分 NTFS 與共用 (Share) 權限",
      "實作 ABE (存取基礎列舉)，讓無權限的使用者看不到該資料夾",
      "安裝 FSRM (檔案伺服器資源管理員) 角色",
      "設定資料夾配額 (Quota)，當容量使用達 90% 時發送通知警告",
      "建立檔案遮蔽 (File Screen) 阻擋使用者上傳 .mp3, .exe 或勒索軟體常用附檔名",
      "部署 DFS (分散式檔案系統) 命名空間以統一共用路徑",
      "設定 DFS 複寫 (Replication) 實作多台檔案伺服器即時同步"
    ],
    quiz: [
      {
        question: "若一個使用者對於共用資料夾的「共用權限」為「讀取 (Read)」，而「NTFS 權限」為「修改 (Modify)」，當該使用者透過網路存取該資料夾時，其實際有效權限為何？",
        options: [
          "修改 (Modify)",
          "讀取 (Read)",
          "完全控制 (Full Control)",
          "無權限拒絕存取"
        ],
        correct: 1,
        explanation: "當透過網路存取共用資料夾時，最終有效權限是「共用權限」與「NTFS 權限」兩者中「最嚴格 (Most Restrictive)」的那一個。在此例中，讀取比修改嚴格，因此實際權限為「讀取」。"
      },
      {
        question: "在 Windows Server 2022 中，如何隱藏使用者沒有讀取權限的共用子資料夾，以防機密目錄名稱外洩？",
        options: [
          "啟用隱藏屬性 (Hidden Attribute)",
          "啟用存取基礎列舉 (ABE, Access-Based Enumeration)",
          "關閉網路瀏覽 (Network Discovery)",
          "使用 NTFS 拒絕列出目錄內容"
        ],
        correct: 1,
        explanation: "存取基礎列舉 (Access-Based Enumeration, ABE) 是共用資料夾的一項功能，啟用後，使用者在瀏覽共用目錄時，只能看見自己擁有讀取權限的資料夾與檔案，無權限的項目將被隱藏。"
      }
    ],
    sections: [
      {
        title: "5.1 共用與 NTFS 權限計算規則",
        content: `### 共享資料夾權限與實體安全交集
共享資料夾的存取權是由「共用權限」和「NTFS 權限」取兩者**交集（最嚴格者）**決定。

* **最佳實作建議**：共用權限一律設定為「Everyone -> 完全控制 (Full Control)」或「Authenticated Users -> 變更/讀取」，然後**完全使用 NTFS 權限**進行細部的權限控制，以防多重交集導致邏輯混亂。

### 使用 PowerShell 設定 ACL 權限與建立共用
請以系統管理員身分執行以下腳本：

\`\`\`powershell
# ==================== 1. 建立實體目錄 ====================
$Path = "D:\\Shares\\FinanceDocs"
if (-not (Test-Path $Path)) { New-Item -Path $Path -ItemType Directory -Force }

# ==================== 2. 建立共用並啟用 ABE ====================
$ShareName = "Finance"
New-SmbShare -Name $ShareName -Path $Path -FullAccess "Everyone" -FolderEnumerationMode AccessAllowed

# ==================== 3. 配置 NTFS 權限 (移除繼承，指派新規則) ====================
$Acl = Get-Acl $Path
$Acl.SetAccessRuleProtection($true, $true)

$Group = "GG-Finance"
$Rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $Group,
    "Modify",
    "ContainerInherit, ObjectInherit",
    "None",
    "Allow"
)
$Acl.AddAccessRule($Rule)

Set-Acl -Path $Path -AclObject $Acl
\`\`\``
      },
      {
        title: "5.2 檔案伺服器資源管理員 (FSRM) 實務",
        content: `### FSRM 容量配額與防勒索軟體遮蔽
FSRM (File Server Resource Manager) 能為資料夾限制配額並阻擋特定檔案。

\`\`\`powershell
# ==================== 1. 安裝 FSRM 角色功能 ====================
Install-WindowsFeature -Name FS-Resource-Manager -IncludeManagementTools

# ==================== 2. 建立資料夾容量配額 (Quota) ====================
# 為共享目錄設定 10GB 硬式配額 (到達限制不准許寫入)
# New-FsrmQuota -Path "D:\\Shares\\FinanceDocs" -Size 10GB -Description "Limit HR to 10GB"

# ==================== 3. 實作檔案遮蔽 (防勒索軟體加密副檔名) ====================
# 新增防範勒索軟體常有之加密副檔名群組
New-FsrmFileGroup -Name "RansomwareExtensions" -IncludePattern @("*.onion", "*.crypt", "*.locked", "*.encrypted")

# 建立檔案遮蔽，阻擋在此目錄內寫入此類加密檔
New-FsrmFileScreen -Path "D:\\Shares" -FileGroup "RansomwareExtensions" -Active
\`\`\``
      },
      {
        title: "5.3 DFS 分散式檔案系統配置",
        content: `### 部署 DFS 命名空間
DFS 能將不同伺服器的共享資料夾整合成單一路徑。

\`\`\`powershell
# ==================== 1. 安裝 DFS 角色功能 ====================
Install-WindowsFeature -Name FS-DFS-Namespace, FS-DFS-Replication -IncludeManagementTools

# ==================== 2. 建立網域型 DFS 命名空間 ====================
# 建立路徑為 \\\\lab.local\\DFS-Share 根路徑
New-DfsnRoot -Path "\\\\lab.local\\DFS-Share" -TargetPath "\\\\SRV-DC-01\\Finance" -Type DomainV2

# ==================== 3. 在命名空間中新增虛擬連結 ====================
New-DfsnFolder -Path "\\\\lab.local\\DFS-Share\\HR" -TargetPath "\\\\SRV-FS-02\\HR-Docs"
\`\`\``
      }
    ]
  },
  {
    id: "ch6_hyperv",
    title: "第六章：Hyper-V 虛擬化平台架設與 VM 管理",
    description: "開啟 Hyper-V 角色，配置外部、內部與私有虛擬交換器，建立 VM、動態記憶體及檢查點管理。",
    checklist: [
      "確認 CPU 已開啟硬體輔助虛擬化 (Intel VT-x / AMD-V) 與 SLAT",
      "安裝 Hyper-V 角色並重新啟動主機",
      "在虛擬交換器管理員中建立外部 (External) 虛擬交換器",
      "建立一台虛擬機器 (VM)，指派 CPU 核心、動態記憶體與虛擬硬碟 (VHDX)",
      "掛載作業系統 ISO 映像檔並啟動 VM 安裝客體作業系統 (Guest OS)",
      "實作 Hyper-V 檢查點 (Checkpoint) 進行狀態備份與還原",
      "設定巢狀虛擬化 (Nested Virtualization) 支援在 VM 中再開 VM"
    ],
    quiz: [
      {
        question: "在 Hyper-V 中，如果希望虛擬機器 (VM) 能夠與實體網路上的其他實體主機以及外部路由器直接進行通訊，應選擇哪一種虛擬交換器 (Virtual Switch) 類型？",
        options: [
          "外部虛擬交換器 (External Switch)",
          "內部虛擬交換器 (Internal Switch)",
          "私有虛擬交換器 (Private Switch)",
          "全域虛擬交換器 (Global Switch)"
        ],
        correct: 0,
        explanation: "外部交換器 (External) 會與伺服器的實體網路卡進行繫結，使虛擬機器能像實體機一樣，直接存取外網與實體 LAN 上的設備。"
      },
      {
        question: "Hyper-V 的「生產檢查點 (Production Checkpoints)」與「標準檢查點 (Standard Checkpoints)」主要不同之處在哪？",
        options: [
          "生產檢查點不佔用磁碟空間",
          "生產檢查點會使用 Guest OS 內的磁碟陰影複製服務 (VSS) 來建立資料一致性的備份，而標準檢查點是捕捉硬體狀態與記憶體",
          "標準檢查點僅支援 Linux 系統",
          "生產檢查點只能在虛擬機關機時建立"
        ],
        correct: 1,
        explanation: "生產檢查點使用客體作業系統中的備份技術（Windows 的 VSS 或 Linux 的 File System Freeze）來建立不包含記憶體狀態的應用程式一致性快照，這在生產環境中進行還原時更安全穩定。標準檢查點則捕捉 VM 的記憶體與 CPU 狀態，可能導致資料在特定資料庫套件中產生不一致。"
      }
    ],
    sections: [
      {
        title: "6.1 虛擬交換器 (Virtual Switch) 網路分類",
        content: `### Hyper-V 網路拓撲結構
虛擬機器與實體主機、其他虛擬機器，以及外部實體網路的通訊，皆由虛擬交換器轉送：

* **外部 (External)**：綁定實體網卡，VM 具有對應外部網路的實體 IP/DHCP IP。可用於對外提供服務。
* **內部 (Internal)**：僅限 VM 之間、以及 VM 與本機 Hyper-V Host 實體主機通訊。
* **私有 (Private)**：僅限 VM 之間通訊，連本機實體主機都無法連接，適合封閉安全實驗室。`
      },
      {
        title: "6.2 建立與優化 VM 實務",
        content: `### Hyper-V 角色安裝與 VM 自動建置腳本
請在啟用虛擬化擴充功能 (Intel VT-x / AMD-V) 的主機上執行以下指令：

\`\`\`powershell
# ==================== 1. 安裝 Hyper-V 角色並重啟 ====================
# Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart

# ==================== 2. 建立虛擬網路交換器 ====================
$NetAdapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
New-VMSwitch -Name "MyExternalSwitch" -NetAdapterName $NetAdapter.Name -AllowManagementOS $true

# ==================== 3. 快速建立虛擬機器 (VM) ====================
$VMName = "VM-WebServer"
$VHDXPath = "D:\\Hyper-V\\VHDs\\$VMName.vhdx"

New-VHD -Path $VHDXPath -SizeBytes 60GB -Dynamic
New-VM -Name $VMName -MemoryStartupBytes 2GB -Generation 2 -VHDPath $VHDXPath -SwitchName "MyExternalSwitch"

Set-VMMemory -VMName $VMName -DynamicMemoryEnabled $true -MinimumBytes 512MB -StartupBytes 2GB -MaximumBytes 4GB
Set-VMProcessor -VMName $VMName -Count 2
Set-VMDvdDrive -VMName $VMName -Path "D:\\ISOs\\WindowsServer2022.iso"

# ==================== 4. 啟用巢狀虛擬化 (選用) ====================
# Set-VMProcessor -VMName $VMName -ExposeVirtualizationExtensions $true
\`\`\``
      }
    ]
  },
  {
    id: "ch7_iis",
    title: "第七章：IIS 網頁伺服器架設與 HTTPS 安全憑證",
    description: "部署網頁伺服器 IIS、架設多個網站（利用 Bindings 與主機標頭）、申請自我簽署憑證並設定 SSL/HTTPS 加密連線。",
    checklist: [
      "安裝 Web 伺服器 (IIS) 角色及相關開發與安全模組",
      "在 C: 槽下建立自訂網頁目錄，並取代預設的 iisstart.htm 測試頁面",
      "在 DNS 伺服器中為網站註冊別名或 A 記錄",
      "在 IIS 中建立新網站，並使用「主機名稱 (Host Header)」實作單一 IP 跑多個網站",
      "使用 IIS 管理員產生自我簽署憑證 (Self-Signed Certificate)",
      "新增 HTTPS (Port 443) 綁定並套用該 SSL 憑證",
      "設定 IIS URL 重新導向 (Redirect) 讓 HTTP 強制導向至 HTTPS"
    ],
    quiz: [
      {
        question: "在只有一個實體 IP 位址的伺服器上，如果想要同時架設並運作兩個不同的網站（例如 www.siteA.com 與 www.siteB.com），在 IIS 中應透過什麼機制來區分客戶端的連線？",
        options: [
          "應用程式集區 (Application Pools)",
          "主機標頭名稱 (Host Headers / Bindings)",
          "不同的實體磁碟路徑",
          "修改 Windows 登錄檔的 Port 號限制"
        ],
        correct: 1,
        explanation: "主機標頭名稱 (Host Header) 綁定允許 IIS 讀取 HTTP 請求標頭中的 Host 欄位，以此判斷要將請求交給哪一個網站處理，這讓單一 IP 綁定多個網域名稱變得可行。"
      },
      {
        question: "為什麼在生產環境中不建議使用 IIS 生成的「自我簽署憑證 (Self-Signed Certificate)」來提供公開 HTTPS 服務？",
        options: [
          "因為自我簽署憑證不支援 AES 加密演算法",
          "因為它無法在 Windows Server 上安裝",
          "因為它不是由受信任的第三方憑證授權單位 (CA) 簽發，客戶端瀏覽器會顯示高度不信任的安全警告",
          "因為它的有效期只有 30 天"
        ],
        correct: 2,
        explanation: "自我簽署憑證是自簽自證，客體電腦的核心信任根憑證清單中沒有這張憑證的簽發者，因此瀏覽器會跳出警告。公開網站應向 GlobalSign、Let's Encrypt 等受信任的 CA 申請憑證。"
      }
    ],
    sections: [
      {
        title: "7.1 IIS 基礎建置與主機標頭實務",
        content: `### IIS 安裝與主機標頭虛擬主機
主機標頭 (Host Header) 綁定允許您使用單一實體 IP 位址架設無限多個不同網名的網站。

\`\`\`powershell
# ==================== 1. 安裝 IIS 角色功能 ====================
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# ==================== 2. 建立實體目錄與測試首頁 ====================
$Site1Path = "C:\\inetpub\\app1"
$Site2Path = "C:\\inetpub\\app2"

New-Item -Path $Site1Path, $Site2Path -ItemType Directory -Force
New-Item -Path "$Site1Path\\index.html" -ItemType File -Value "<h1>Welcome to App 1</h1>" -Force
New-Item -Path "$Site2Path\\index.html" -ItemType File -Value "<h1>Welcome to App 2</h1>" -Force

# ==================== 3. 在 IIS 中建立不同網站並繫結主機名稱 ====================
Import-Module WebAdministration
Remove-Website -Name "Default Web Site"

New-Website -Name "App1-Site" -PhysicalPath $Site1Path -Port 80 -HostHeader "app1.lab.local"
New-Website -Name "App2-Site" -PhysicalPath $Site2Path -Port 80 -HostHeader "app2.lab.local"
\`\`\``
      },
      {
        title: "7.2 HTTPS 與 SSL 憑證配置",
        content: `### 一鍵配置 HTTPS 與 SSL 憑證繫結
請在 IIS 伺服器上複製以下腳本，將自動生成自我簽署 SSL 安全性憑證，並將其綁定至您的網站：

\`\`\`powershell
# ==================== 1. 產生自我簽署憑證 ====================
$DnsName = "app1.lab.local"
$Cert = New-SelfSignedCertificate -DnsName $DnsName -CertStoreLocation "cert:\\LocalMachine\\My" -FriendlyName "IIS-$DnsName-SSL"

# ==================== 2. 設定 HTTPS Port 443 綁定與證書繫結 ====================
$Thumbprint = $Cert.Thumbprint

Import-Module WebAdministration
New-WebBinding -Name "App1-Site" -IPAddress "*" -Port 443 -Protocol "https" -HostHeader $DnsName

$Path = "IIS:\\SslBindings\\0.0.0.0!443"
Get-Item -Path "cert:\\LocalMachine\\My\\$Thumbprint" | New-Item -Path $Path -Force
Set-ItemProperty -Path "IIS:\\Sites\\App1-Site" -Name bindings -Value (@{protocol="https";bindingInformation="*:443:$DnsName"})

Write-Host "HTTPS 繫結完成！" -ForegroundColor Green
\`\`\``
      }
    ]
  },
  {
    id: "ch8_security_wsus",
    title: "第八章：防火牆、安全稽核與 WSUS 更新管理",
    description: "學習 Windows 防火牆進階設定、設定 GPO 安全稽核原則追蹤登入事件，以及建置 WSUS 派發更新。",
    checklist: [
      "開啟進階安全 Windows 防火牆，設定自訂入站 (Inbound) 規則",
      "啟用網域群組原則中的「稽核登入事件」與「稽核目錄服務存取」",
      "在事件檢視器中篩選並分析 Event ID 4624 (登入成功) 與 4625 (登入失敗)",
      "安裝 Windows Server Update Services (WSUS) 角色與配置資料庫",
      "設定 WSUS 同步排程與選擇欲下載的產品更新分類",
      "使用 GPO 設定客戶端電腦自動向本機 WSUS 伺服器回報並下載更新",
      "在 WSUS 控制台建立電腦群組並核准 (Approve) 測試更新更新檔"
    ],
    quiz: [
      {
        question: "在 Windows 安全事件稽核中，哪一個事件識別碼 (Event ID) 代表「帳戶登入失敗」（常用於抓取暴力破解攻擊）？",
        options: [
          "Event ID 4624",
          "Event ID 4625",
          "Event ID 4720",
          "Event ID 7036"
        ],
        correct: 1,
        explanation: "Windows 安全性記錄中，Event ID 4624 代表登入成功，而 Event ID 4625 代表登入失敗（An account failed to log on）。Event ID 4720 則是建立新使用者帳戶。"
      },
      {
        question: "若要讓企業內部的數百台用戶端電腦改向自建的 WSUS 伺服器取得更新，而不是直接連上微軟官網下載，最有效的配置方式 homes 點選？",
        options: [
          "定時手動修改用戶端電腦的 Host 檔案",
          "設定 Active Directory 群組原則 (GPO) 的「指定內部 Microsoft 更新服務位置」",
          "在防火牆封鎖所有微軟更新伺服器的 IP 網段",
          "在 DHCP 伺服器中設定額外的更新選項參數"
        ],
        correct: 1,
        explanation: "透過 GPO 中「電腦設定\\原則\\系統管理範本\\Windows 元件\\Windows Update\\指定內部 Microsoft 更新服務位置」設定，輸入 WSUS 的網址（例如 http://srv-wsus:8530），即可強制用戶端向 WSUS 註冊與下載更新。"
      }
    ],
    sections: [
      {
        title: "8.1 進階安全 Windows 防火牆與事件稽核",
        content: `### 防火牆進階設定與事件檢索
防火牆阻擋外部攻擊，安全性稽核則提供事後追查的軌跡。

\`\`\`powershell
# ==================== 1. 自訂防火牆規則 ====================
New-NetFirewallRule -Name "AllowSQLInbound" \
                    -DisplayName "Allow SQL Server Port 1433" \
                    -Direction Inbound \
                    -LocalPort 1433 \
                    -Protocol TCP \
                    -RemoteAddress "192.168.1.0/24" \
                    -Action Allow

# ==================== 2. 用 PowerShell 篩選安全性登入事件 ====================
Get-WinEvent -FilterHashtable @{LogName='Security';ID=4625} -MaxEvents 20 | 
    Select-Object TimeCreated, 
                  @{Name="Username";Expression={$_.Properties[5].Value}},
                  @{Name="Source-IP";Expression={$_.Properties[19].Value}} | Format-Table
\`\`\``
      },
      {
        title: "8.2 WSUS 更新伺服器部署指南",
        content: `### 部署企業內網更新服務 (WSUS)
自建更新伺服器，集中控制補丁核准，節省外網頻寬。

\`\`\`powershell
# ==================== 1. 安裝 WSUS 角色功能 ====================
Install-WindowsFeature -Name UpdateServices, UpdateServices-UI -IncludeManagementTools

# ==================== 2. WSUS 初始化設定與下載路徑指定 ====================
New-Item -Path "D:\\WSUS-Updates" -ItemType Directory -Force
& "C:\\Program Files\\Update Services\\Tools\\wsusutil.exe" postinstall CONTENT_DIR="D:\\WSUS-Updates"
\`\`\``
      }
    ]
  },
  {
    id: "ch9_powershell",
    title: "第九章：PowerShell 自動化維護與維護排程",
    description: "學習常用 PowerShell 指令、撰寫管理指令碼，並結合工作排程器 (Task Scheduler) 實現伺服器自動化維護。",
    checklist: [
      "掌握 PowerShell Pipeline (管線 |) 與物件過濾 (Where-Object) 用法",
      "撰寫一個自動清理磁碟暫存檔與 IIS Log 的指令碼 (.ps1)",
      "撰寫備份指定資料夾並自動壓縮為 ZIP 的腳本",
      "設定 Windows 工作排程器 (Task Scheduler) 定期執行該腳本",
      "設定工作排程執行身分為 SYSTEM 並開啟「不論使用者登入與否均執行」",
      "利用 PowerShell 排程定期檢查硬碟剩餘空間，低於 15% 時發送 Event Log"
    ],
    quiz: [
      {
        question: "在 Windows Server 中，如果您寫了一個 PowerShell 腳本 (.ps1) 並想用「工作排程器」在背景自動執行，應在「啟動程式」的引數 (Arguments) 中如何設定？",
        options: [
          "-File C:\\Scripts\\backup.ps1",
          "-ExecutionPolicy Bypass -File C:\\Scripts\\backup.ps1",
          "-RunMode Admin -Source C:\\Scripts\\backup.ps1",
          "-Console -Path C:\\Scripts\\backup.ps1"
        ],
        correct: 1,
        explanation: "Windows 預設的執行原則限制了腳本執行。使用 -ExecutionPolicy Bypass 參數可以暫時繞過限制，順利執行備份腳本，而不需要全域降低伺服器的安全限制。"
      },
      {
        question: "PowerShell 指令中，要將前一個指令輸出的物件傳遞給下一個指令進行篩選或處理，應該使用哪一個符號？",
        options: [
          "大於符號 (>)",
          "加號 (+)",
          "管線符號 (|)",
          "百分比符號 (%)"
        ],
        correct: 2,
        explanation: "管線符號 (|) 是 PowerShell 的靈魂，它將左側 Cmdlet 輸出的「物件」傳遞給右側的 Cmdlet，供其進行排序、過濾（Where-Object）或輸出轉換（Export-Csv）。"
      }
    ],
    sections: [
      {
        title: "9.1 PowerShell 核心語法與管道串聯",
        content: `### PowerShell 物件管線實務
PowerShell 核心精髓在於傳遞「強型別物件」而非純文字，透過 Pipeline (\`|\`) 可以快速關聯多個任務Task。

\`\`\`powershell
# ==================== 1. 篩選與排序 CPU 佔用最高的行程 ====================
Get-Process | Where-Object { $_.WorkingSet -gt 200MB } | Sort-Object WorkingSet -Descending | Format-Table ProcessName, Id, CPU, WorkingSet

# ==================== 2. 批次查詢關閉中的服務 ====================
Get-Service | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -eq 'Stopped' } | Select-Object DisplayName, Name
\`\`\``
      },
      {
        title: "9.2 自動化維護腳本與工作排程器實作",
        content: `### 實用自動化維護：定時清理 IIS 日誌與排程設定
IIS 的記錄檔（預設在 \`C:\\inetpub\\logs\\LogFiles\`）會隨著時間堆積爆滿 C 槽。

請將以下指令存為 \`C:\\Scripts\\Clean-IISLogs.ps1\`，此腳本會自動刪除超過 30 天的 \`.log\` 檔：

\`\`\`powershell
# ==================== 1. 建立自動清理指令碼 ====================
$LogPath = "C:\\inetpub\\logs\\LogFiles"
$Days = 30
$LimitDate = (Get-Date).AddDays(-$Days)

if (Test-Path $LogPath) {
    Get-ChildItem -Path $LogPath -Recurse -Filter "*.log" | 
        Where-Object { $_.LastWriteTime -lt $LimitDate } | 
        Remove-Item -Force -Verbose
}

# ==================== 2. 註冊至工作排程器 (Task Scheduler) ====================
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File C:\\Scripts\\Clean-IISLogs.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At "3:00AM"
$Principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\\SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "AutoCleanIISLogs" -Action $Action -Trigger $Trigger -Principal $Principal -Description "Daily clean IIS web server logs over 30 days"
\`\`\``
      }
    ]
  },
  {
    id: "ch10_backup",
    title: "第十章：備份、還原與災害復原 (Disaster Recovery)",
    description: "學習安裝 Windows Server Backup 工具、設定排程備份、執行裸機還原 (BMR)，以及啟用 Active Directory 資源回收筒。",
    checklist: [
      "安裝 Windows Server Backup 角色功能",
      "建立一次性備份 (Backup Once) 測試儲存到外接硬碟或網路共用資料夾",
      "設定每日定時備份計畫，包含系統狀態 (System State) 與裸機復原 (BMR) 資料",
      "在 Active Directory 中開啟「AD 資源回收筒 (AD Recycle Bin)」功能",
      "測試在 AD 中刪除使用者帳戶，並在不重啟 DC 的情況下用資源回收筒還原",
      "了解如何進入目錄服務還原模式 (DSRM) 還原受損的 AD 資料庫"
    ],
    quiz: [
      {
        question: "在 Active Directory 網域中，若誤刪了某個員工的 AD 帳戶，在已啟用「AD 資源回收筒」的前提下，最理想的復原方式為何？",
        options: [
          "使用 Windows Server Backup 執行完整的實體機還原，並讓伺服器離線一天",
          "進入目錄服務還原模式 (DSRM)，還原昨天的 System State 備份",
          "直接在 AD 管理中心 (ADAC) 的「Deleted Objects」容器中點選該物件並按「還原」",
          "重新手動建一個同名同密碼的帳戶，即可自動恢復其 SID 與權限"
        ],
        correct: 2,
        explanation: "啟用 AD 資源回收筒後，被刪除的網域物件會被移至 Deleted Objects 容器中保留（預設 180 天）。在此期間，管理員可直接在線上點選還原，這會完整保留其原本的 SID 及所有群組屬性，不需要將 DC 關機或還原備份。"
      },
      {
        question: "Windows Server Backup 中的「裸機復原 (BMR, Bare Metal Recovery)」備份包含哪些內容？",
        options: [
          "只包含使用者個人的桌面檔案與文件",
          "只包含作業系統核心的開機檔案",
          "包含作業系統檔案、系統狀態以及復原開機所需的所有磁碟磁區，允許將系統還原到全新且無系統的空白硬體主機上",
          "只包含 Active Directory 的資料庫"
        ],
        correct: 2,
        explanation: "裸機復原 (BMR) 備份會包含系統作業系統、開機磁區及所有系統關鍵磁碟區的完整快照，使伺服器損毀後，管理員能直接使用 Windows 安裝開機碟開機，並將整台伺服器鏡像還原到一台全新的空白硬體主機上。"
      }
    ],
    sections: [
      {
        title: "10.1 Windows Server Backup 與系統備份策略",
        content: `### 系統狀態 (System State) 與裸機還原 (BMR) 備份
Windows Server Backup 能保證伺服器崩潰後的災後重建。

\`\`\`powershell
# ==================== 1. 安裝 Windows 備份角色 ====================
Install-WindowsFeature -Name Windows-Server-Backup -IncludeManagementTools

# ==================== 2. 執行一次性手動備份 (備份到 E 槽) ====================
wbadmin start backup -backupTarget:E: -allCritical -systemState -quiet

# ==================== 3. 建立每日定時備份排程 ====================
# (以備份 C 槽與系統狀態到獨立外接碟區 E: 為例，每日 23:00 執行)
$Policy = New-WBPolicy
Add-WBSystemState -Policy $Policy
Add-WBBareMetalRecovery -Policy $Policy

$Volume = Get-WBVolume -VolumePath "C:"
Add-WBVolume -Policy $Policy -Volume $Volume

$BackupTarget = New-WBBackupTarget -VolumePath "E:"
Add-WBBackupTarget -Policy $Policy -Target $BackupTarget

Set-WBSchedule -Policy $Policy -Schedule "23:00"
Set-WBPolicy -Policy $Policy
\`\`\``
      },
      {
        title: "10.2 Active Directory 資源回收筒實務",
        content: `### AD 資源回收筒啟用與一秒還原
預設關閉。啟用後在 180 天之內誤刪的使用者帳戶、電腦或群組，可以不關機在線上直接完美還原。

> [!WARNING]
> AD 資源回收筒啟用為**不可逆**之操作，一旦在網域中啟用便無法關閉。

\`\`\`powershell
# ==================== 1. 啟用 AD 資源回收筒 ====================
$Domain = "lab.local"
Enable-ADOptionalFeature -Identity "CN=Recycle Bin Feature,CN=Optional Features,CN=Directory Service,CN=Windows NT,CN=Services,CN=Configuration,DC=lab,DC=local" \
                         -Scope ForestOrConfigurationSet \
                         -Target $Domain \
                         -Force

# ==================== 2. 查詢並還原被誤刪的使用者 ====================
Get-ADObject -Filter 'samAccountName -eq "johndoe"' -IncludeDeletedObjects | Restore-ADObject

# ==================== 3. 查詢並還原台北整個被刪除的 OU ====================
Get-ADObject -Filter 'Name -eq "Taipei" -and Deleted -eq $true' -IncludeDeletedObjects | Restore-ADObject
\`\`\``
      }
    ]
  }
];

// Export to window object for web consumption
if (typeof window !== 'undefined') {
  window.tutorialsData = tutorialsData;
}
