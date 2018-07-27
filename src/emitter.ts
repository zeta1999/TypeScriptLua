import * as ts from 'typescript';
import { BinaryWriter } from './binarywriter';
import { FunctionContext } from './contexts';
import { IdentifierResolver, ResolvedInfo, ResolvedKind } from './resolvers';
import { Ops, OpMode, OpCodes, LuaTypes } from './opcodes';
import { Helpers } from './helpers';

export class Emitter {
    public writer: BinaryWriter = new BinaryWriter();
    private functionContextStack: Array<FunctionContext> = [];
    private functionContext: FunctionContext;
    private resolver: IdentifierResolver;

    public constructor(typeChecker: ts.TypeChecker) {
        this.resolver = new IdentifierResolver(typeChecker);
    }

    public processNode(node: ts.Node): void {
        switch (node.kind) {
            case ts.SyntaxKind.SourceFile: this.processFile(<ts.SourceFile>node); return;
            case ts.SyntaxKind.Bundle: this.processBundle(<ts.Bundle>node); return;
            case ts.SyntaxKind.UnparsedSource: this.processUnparsedSource(<ts.UnparsedSource>node); return;
        }

        // TODO: finish it
        throw new Error('Method not implemented.');
    }

    private pushFunctionContext() {
        const localFunctionContext = this.functionContext;
        this.functionContextStack.push(localFunctionContext);
        this.functionContext = new FunctionContext();
        this.functionContext.container = localFunctionContext;
    }

    private popFunctionContext(): FunctionContext {
        const localFunctionContext = this.functionContext;
        this.functionContext = this.functionContextStack.pop();
        return localFunctionContext;
    }

    private processFunction(statements: ts.NodeArray<ts.Statement>): FunctionContext {
        this.pushFunctionContext();
        statements.forEach(s => {
            this.processStatement(s);
        });

        // add final 'RETURN'
        this.functionContext.code.push([Ops.RETURN, 0, 1]);

        return this.popFunctionContext();
    }

    private processFile(sourceFile: ts.SourceFile): void {
        this.emitHeader();

        const localFunctionContext = this.processFunction(sourceFile.statements);

        // this is global function
        localFunctionContext.is_vararg = true;

        // f->sizeupvalues (byte)
        this.writer.writeByte(localFunctionContext.upvalues.length);
        this.emitFunction(localFunctionContext);
    }

    private processBundle(bundle: ts.Bundle): void {
        throw new Error('Method not implemented.');
    }

    private processUnparsedSource(unparsedSource: ts.UnparsedSource): void {
        throw new Error('Method not implemented.');
    }

    private processStatement(node: ts.Statement): void {
        switch (node.kind) {
            case ts.SyntaxKind.EmptyStatement: return;
            case ts.SyntaxKind.VariableStatement: this.processVariableStatement(<ts.VariableStatement>node); return;
            case ts.SyntaxKind.FunctionDeclaration: this.processFunctionDeclaration(<ts.FunctionDeclaration>node); return;
            case ts.SyntaxKind.ExpressionStatement: this.processExpressionStatement(<ts.ExpressionStatement>node); return;
        }

        // TODO: finish it
        throw new Error('Method not implemented.');
    }

    private processVariableStatement(node: ts.VariableStatement): void {
        node.declarationList.declarations.forEach(d => {
            if (Helpers.isConstOrLet(node)) {
                const nameLocalIndex = -this.functionContext.findOrCreateLocal((<ts.Identifier>d.name).text);
                throw new Error('Method not implemented.');
            } else {
                const nameConstIndex = -this.functionContext.findOrCreateConst((<ts.Identifier>d.name).text);
                if (d.initializer) {
                    this.processExpression(d.initializer);

                    const registerOrConst = this.functionContext.getRegisterOrConst(d.initializer);
                    this.functionContext.code.push([
                        Ops.SETTABUP,
                        -this.resolver.returnResolvedEnv(this.functionContext).value,
                        nameConstIndex,
                        registerOrConst]);
                }
            }
        });
    }

    private processFunctionDeclaration(node: ts.FunctionDeclaration): void {
        const nameConstIndex = -this.functionContext.findOrCreateConst(node.name.text);
        const closureFunctionContext = this.processFunction(node.body.statements);
        const protoIndex = -this.functionContext.createProto(closureFunctionContext);

        // load closure into R(A), TODO: finish it
        const register = this.functionContext.current_register++;
        this.functionContext.code.push([Ops.CLOSURE, register, protoIndex]);

        // store in Upvalue
        const upvalueContainer = (!this.functionContext.container) ? this.resolver.returnResolvedEnv(this.functionContext).value : null;
        this.functionContext.code.push([Ops.SETTABUP, upvalueContainer, protoIndex, register]);
    }

    private processExpressionStatement(node: ts.ExpressionStatement): void {
        this.processExpression(node.expression);
    }

    private processExpression(node: ts.Expression): void {
        switch (node.kind) {
            case ts.SyntaxKind.CallExpression: this.processCallExpression(<ts.CallExpression>node); return;
            case ts.SyntaxKind.PropertyAccessExpression: this.processPropertyAccessExpression(<ts.PropertyAccessExpression>node); return;
            case ts.SyntaxKind.BinaryExpression: this.processBinaryExpression(<ts.BinaryExpression>node); return;
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword: this.processBooleanLiteral(<ts.BooleanLiteral>node); return;
            case ts.SyntaxKind.NumericLiteral: this.processNumericLiteral(<ts.NumericLiteral>node); return;
            case ts.SyntaxKind.StringLiteral: this.processStringLiteral(<ts.StringLiteral>node); return;
            case ts.SyntaxKind.Identifier: this.processIndentifier(<ts.Identifier>node); return;
        }

        // TODO: finish it
        throw new Error('Method not implemented.');
    }

    private processBooleanLiteral(node: ts.BooleanLiteral): void {
        const resolvedInfo = new ResolvedInfo();
        resolvedInfo.kind = ResolvedKind.Const;
        resolvedInfo.value = -this.functionContext.findOrCreateConst(node.kind === ts.SyntaxKind.TrueKeyword);
        (<any>node).resolved_value = resolvedInfo;
    }

    private processNumericLiteral(node: ts.NumericLiteral): void {
        const resolvedInfo = new ResolvedInfo();
        resolvedInfo.kind = ResolvedKind.Const;
        resolvedInfo.value = -this.functionContext.findOrCreateConst(
            node.text.indexOf('.') === -1 ? parseInt(node.text, 10) : parseFloat(node.text));
        (<any>node).resolved_value = resolvedInfo;
    }

    private processStringLiteral(node: ts.StringLiteral): void {
        const resolvedInfo = new ResolvedInfo();
        resolvedInfo.kind = ResolvedKind.Const;
        resolvedInfo.value = -this.functionContext.findOrCreateConst(node.text);
        (<any>node).resolved_value = resolvedInfo;
    }

    private processBinaryExpression(node: ts.BinaryExpression): void {
        // ... = <right>
        this.processExpression(node.right);

        // <left> = ...
        this.processExpression(node.left);

        // perform '='
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.EqualsToken:

                if (this.functionContext.isUpvalue(node.left)) {
                    this.functionContext.code.push([
                        Ops.SETTABUP,
                        this.functionContext.getUpvalue(node.left),
                        this.functionContext.getRegisterOrConst(node.left),
                        this.functionContext.getRegisterOrConst(node.right)]);
                }

                break;
            default: throw new Error('Not Implemented');
        }
    }

    private processCallExpression(node: ts.CallExpression): void {
        // method
        this.processExpression(node.expression);
        this.consumeExpression(node.expression);

        // arguments
        node.arguments.forEach(a => {
            this.processExpression(a);
            this.consumeExpression(a);
        });

        const returnCount = 0;
        this.functionContext.code.push(
            [Ops.CALL, this.functionContext.getRegister(node.expression), node.arguments.length + 1, returnCount + 1]);
        this.functionContext.decreaseRegister(returnCount);
    }

    // method to load constants into registers when they are needed, for example for CALL code.
    private consumeExpression(node: ts.Node): void {
        if (!(<any>node).resolved_value) {
            return;
        }

        const resolvedInfo: ResolvedInfo = <ResolvedInfo>(<any>node).resolved_value;
        if (resolvedInfo.kind === ResolvedKind.Const) {
            // TODO: track correct register (1)
            this.functionContext.code.push([Ops.LOADK, this.functionContext.useRegister(node), resolvedInfo.value]);
        }

        // if it simple expression of identifier
        if ((<any>node).resolved_owner) {
            // then it is simple Table lookup
            const objectIdentifierInfo = <ResolvedInfo>(<any>node).resolved_owner;
            const memberIdentifierInfo = resolvedInfo;

            this.functionContext.code.push(
                [Ops.GETTABUP, this.functionContext.useRegister(node), objectIdentifierInfo.value, memberIdentifierInfo.value]);
        }
    }

    private processIndentifier(node: ts.Identifier): void {
        const resolvedInfo = this.resolver.resolver(<ts.Identifier>node, this.functionContext);
        if (resolvedInfo !== undefined) {
            (<any>node).resolved_value = resolvedInfo;
            return;
        }

        // TODO: finish it
        throw new Error('Method not implemented.');
    }

    private processPropertyAccessExpression(node: ts.PropertyAccessExpression): void {
        this.processExpression(node.expression);
        this.consumeExpression(node.expression);

        (<any>node.name).resolved_owner = (<any>node.expression).resolved_value;

        this.processExpression(node.name);
        this.consumeExpression(node.name);

        (<any>node).resolved_value = (<any>node.name).resolved_value;
    }

    private emitHeader(): void {
        // writing header
        // LUA_SIGNATURE
        this.writer.writeArray([0x1b, 0x4c, 0x75, 0x61]);
        // LUAC_VERSION, LUAC_FORMAT
        this.writer.writeArray([0x53, 0x00]);
        // LUAC_DATA: data to catch conversion errors
        this.writer.writeArray([0x19, 0x93, 0x0d, 0x0a, 0x1a, 0x0a]);
        // sizeof(int), sizeof(size_t), sizeof(Instruction), sizeof(lua_Integer), sizeof(lua_Number)
        this.writer.writeArray([0x04, 0x08, 0x04, 0x08, 0x08]);
        // LUAC_INT
        this.writer.writeArray([0x78, 0x56, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);
        // LUAC_NUM
        this.writer.writeArray([0x0, 0x0, 0x0, 0x0, 0x0, 0x28, 0x77, 0x40]);
    }

    private emitFunction(functionContext: FunctionContext): void {
        this.emitFunctionHeader(functionContext);
        this.emitFunctionCode(functionContext);
        this.emitConstants(functionContext);
        this.emitUpvalues(functionContext);
        this.emitProtos(functionContext);
        this.emitDebug(functionContext);
    }

    private emitFunctionHeader(functionContext: FunctionContext): void {
        // write debug info, by default 0 (string)
        this.writer.writeString(functionContext.debug_location || null);

        // f->linedefined = 0, (int)
        this.writer.writeInt(functionContext.linedefined || 0);

        // f->lastlinedefined = 0, (int)
        this.writer.writeInt(functionContext.lastlinedefined || 0);

        // f->numparams (byte)
        this.writer.writeByte(functionContext.numparams || 0);

        // f->is_vararg (byte)
        this.writer.writeByte(functionContext.is_vararg ? 1 : 0);

        // f->maxstacksize
        this.writer.writeByte(functionContext.maxstacksize);
    }

    private emitFunctionCode(functionContext: FunctionContext): void {
        this.writer.writeInt(functionContext.code.length);

        functionContext.code.forEach(c => {
            // create 4 bytes value
            const opCodeMode: OpMode = OpCodes[c[0]];
            const encoded = opCodeMode.encode(c);
            this.writer.writeInt(encoded);
        });
    }

    private emitConstants(functionContext: FunctionContext): void {
        this.writer.writeInt(functionContext.contants.length);

        functionContext.contants.forEach(c => {
            // create 4 bytes value
            switch (typeof c) {
                case 'boolean':
                    this.writer.writeByte(LuaTypes.LUA_TBOOLEAN);
                    this.writer.writeByte(c);
                    break;
                case 'number':
                    if (Number.isInteger(c)) {
                        this.writer.writeByte(LuaTypes.LUA_TNUMINT);
                        this.writer.writeInteger(c);
                    } else {
                        this.writer.writeByte(LuaTypes.LUA_TNUMBER);
                        this.writer.writeNumber(c);
                    }
                    break;
                case 'string':
                    if ((<string>c).length > 255) {
                        this.writer.writeByte(LuaTypes.LUA_TLNGSTR);
                    } else {
                        this.writer.writeByte(LuaTypes.LUA_TSTRING);
                    }

                    this.writer.writeString(c);
                    break;
                default: throw new Error('Method not implemeneted');
            }
        });
    }

    private emitUpvalues(functionContext: FunctionContext): void {
        this.writer.writeInt(functionContext.upvalues.length);

        functionContext.upvalues.forEach((upvalue, index: number) => {
            // in stack (bool)
            this.writer.writeByte((functionContext.container) ? 0 : 1);
            // index
            this.writer.writeByte(index);
        });
    }

    private emitProtos(functionContext: FunctionContext): void {
        this.writer.writeInt(functionContext.protos.length);

        functionContext.protos.forEach(p => {
            // TODO: finish it
            this.emitFunction(p);
        });
    }

    private emitDebug(functionContext: FunctionContext): void {

        if (functionContext.debug.length === 0) {
            this.writer.writeInt(0);
            this.writer.writeInt(0);
            this.writer.writeInt(0);
        } else {
            throw new Error('Method not implemeneted');
        }
    }
}
