' 隐藏窗口运行 switch.js（切换下一张壁纸）
Dim fso, sh, root, node, cand, i
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)

cand = Array( _
  sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe"), _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%\nodejs\node.exe"), _
  sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe"), _
  sh.ExpandEnvironmentStrings("%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"), _
  root & "\node.exe" _
)

node = ""
For i = 0 To UBound(cand)
  If fso.FileExists(cand(i)) Then
    node = cand(i)
    Exit For
  End If
Next

If node = "" Then node = "node.exe"

sh.Run "cmd /c """"" & node & """ """ & root & "\switch.js"" >> """ & root & "\switch.log"" 2>&1""", 0, False
