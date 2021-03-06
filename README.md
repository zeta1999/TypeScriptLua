TypeScript for Lua
===========================

The TypeScriptLua repo contains the complete source code implementation for TypeScript compiler for Lua bytecode.

Chat Room
---------

Want to chat with other members of the TypeScript for Lua community?

[![Join the chat at https://gitter.im/ASDAlexander77/cs2cpp](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/TypeScriptLua/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Engage, Contribute and Provide Feedback
---------------------------------------

Some of the best ways to contribute are to try things out, file bugs, and join in design conversations.


License
-------

TypeScriptLua is licensed under the MIT license.

Quick Start
-----------

Prerequisite: nodejs, Lua 5.3, VSCode

1) Build Project

```
npm install
npm run build
```

2) Compile test.ts

create file test.ts

```TypeScript
declare var print: any;

class Person {
    protected name: string;
    constructor(name: string) { this.name = name; }
}

class Employee extends Person {
    private department: string;

    constructor(name: string, department: string) {
        super(name);
        this.department = department;
    }

    public get ElevatorPitch() {
        return `Hello, my name is ${this.name} and I work in ${this.department}.`;
    }
}

let howard = new Employee("Howard", "Sales");
print(howard.ElevatorPitch);
```

```
node __out/main.js test.ts
```

Now you have test.lua

3) Run it.

```
lua test.lua
```

Result:
```
Hello, my name is Howard and I work in Sales.
```

Enjoy it. 

How to use JavaScript Library
-----------

1) Compile JavaScript Library

```
cd experiments\jslib
node ../../__out/main.js -singleModule
```

2) Copy JS.lua into your folder where you run the compiled app.

3) Compile test.ts

create file test.ts

```TypeScript
class Person {
    protected name: string;
    constructor(name: string) { this.name = name; }
}

class Employee extends Person {
    private department: string;

    constructor(name: string, department: string) {
        super(name);
        this.department = department;
    }

    public get ElevatorPitch() {
        return `Hello, my name is ${this.name} and I work in ${this.department}.`;
    }
}

let howard = new Employee("Howard", "Sales");
console.log(howard.ElevatorPitch);
```

```
node __out/main.js test.ts
```

4) Run it.

```
lua -e "require('./JS')" test.lua
```

Result:
```
Hello, my name is Howard and I work in Sales.
```

Enjoy it