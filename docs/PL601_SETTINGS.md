# Jimi PL601 - settings as the tracker really answers

Captured from the production tracker (IMEI 868322070079370, firmware
`P6401_P6401_WDBI_V1.3.2_260805.1731`) on 2026-10-02 by sending each query as a `0x80`
server command. The manual (PL601 Command List V1.4) describes the commands; this file records
the **actual answers**, which differ from the manual's examples in places. The parsers in
`backend/.../service/TrackerSetting.java` are written against these strings and
`TrackerSettingTest` uses them as fixtures.

| Query | Answer of the production tracker (factory state unless noted) |
|---|---|
| `SOS#` | `SOS Number:1:; 2:; 3:; 4:` (no SOS numbers stored) |
| `SOSALM#` | `SOS HelpSwitch:ON,Report Mode:0,1` (0 = data only: the button does not call or text anyone) |
| `MONPERMIT#` | `MONPERMIT:2` (only SOS numbers may call the tracker) |
| `ANSWER#` | `ANSWER:0` (calls are answered by pressing the button) |
| `CALLVOL#` | `call  volume:5` (two spaces) |
| `RINGVOL#` | `ring volume:4` |
| `HBT#` | `Heartbeat Interval,T1:7 Minute(s)` |
| `MODE#` | `Mode:2,10,300,1,1,1,1` (set by us on 2026-10-02; factory is `Mode:4,100,300,10,300,1,1,1,1`) |
| `FLY#` | `FLY:ON,00:00-07:00,2` (**night rest is ON from the factory: switched off 00:00-07:00**) |
| `SILENTPERIOD#` | `SILENTPERIOD:OFF,00:00,07:00` |
| `BATALM#` | `Low Battery Alarm Switch:ON,Report Mode:0,led reminder mode:1,ring reminder mode:2` |
| `DROPALM#` | `DROPALM:OFF,0,30,3` |
| `PWRLIMIT#` | `Pwrlimit switch Switch:OFF` (five short presses of SOS switch the tracker off) |
| `AUTOSTART#` | `AUTOSTART:ON` |
| `GMT#` | `GMT:E,6,0` (the tracker's clock is Bangladesh time; rest and quiet hours use it) |
| `JC#` | `JC:0` |
| `WN#` | `white list number:1:; 2:; ... 15:` |
| `SV#` | `save mode:ON T1:25sec T2:35sec T3:50sec T4:300sec ` |
| `WIFI,CYCLE#` | `Running wifi scan cycle:180(s),Static wifi scan cycle:0(s)` |
| `PARAM#` | `IMEI:868322070079370; LBSTimer:0min,GPSTimer:30sec; HBT:7min; SOS:,,,; FamilyNumber::,:,:; TimeZone:E6.0;` |
| `STATUS#` | `Battery Voltage:4.05V;Data Link:Link Up;Network Signal Level:27;restart reason:5;GPS:OFF;motion:0;` |
| `BMT#` | `Charger In:vBat=3.69,iChr=0.00,vChr=0.00, Percent:15` (wording when on the charger) |

Report-mode numbers used by `SOSALM`, `BATALM`, `DROPALM`: 0 = data only, 1 = SMS + data,
2 = data + SMS + call, 3 = data + call. SMS and calls go to the SOS numbers and need SIM balance.

Deliberately not offered in the app: `SERVER`, `APN`, `FACTORY`, `SHUTDOWN` and the data /
positioning switches of `MODE` (a wrong value takes the tracker off the network for good), and
the listening functions `MONITOR`, `JC,1`, `LY`, `CXLY` (covert audio).
