IF "%VS150COMNTOOLS%" EQU "" set VS150COMNTOOLS=C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\Tools\

IF "%1" EQU "Release" GOTO :set_release
IF "%2" EQU "Release" GOTO :set_release
SET Mode=Debug
GOTO :cont
:set_release
SET Mode=Release
:cont
IF "%1" NEQ "win64" GOTO :mingw32
cd ..\glew-2.2.0\build\vc15
if not defined DevEnvDir (@call "%VS150COMNTOOLS%\..\..\VC\Auxiliary\Build\vcvarsall.bat" x86_amd64)
"%VS150COMNTOOLS%\..\..\MSBuild\15.0\Bin\MSBuild" glew_shared.vcxproj /m:8 /p:Configuration=%Mode% /p:Platform="x64"
IF "%Mode%" NEQ "Debug" GOTO :skip_debug_copy
copy ..\..\bin\%Mode%\x64\glew32d.dll ..\..\..\..\__dist\glew32d.dll
copy ..\..\bin\%Mode%\x64\glew32d.dll ..\..\..\..\__dist\glew32.dll
:skip_debug_copy
copy ..\..\bin\%Mode%\x64\glew32.dll ..\..\..\..\__dist
GOTO :end
:mingw32
IF NOT EXIST __build MKDIR __build
cd __build
IF NOT EXIST mingw32 MKDIR mingw32
cd mingw32
cmake -Wno-dev -f ..\..\..\glew-2.2.0\build\cmake -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE="%Mode%"
@call mingw32-make
copy bin\glew32.dll ..\..\..\..\__dist
:end