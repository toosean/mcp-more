import { currentPlatform } from "../util/platform";
import { execAsync } from "../util/shell";

export interface RuntimeHandler {

    getInstalledVersionOnWindows(): Promise<string | null>;
    getInstalledVersionOnMacOS(): Promise<string | null>;
    getInstalledVersionOnLinux(): Promise<string | null>;

    getInstallExternalLinkOnWindows(): string;
    getInstallExternalLinkOnMacOS(): string;
    getInstallExternalLinkOnLinux(): string;

    getExecutablePathOnWindows(): Promise<string[] | null>;
    getExecutablePathOnMacOS(): Promise<string[] | null>;
    getExecutablePathOnLinux(): Promise<string[] | null>;

}

export class NodejsHandler implements RuntimeHandler {


    async getInstalledVersionOnWindows(): Promise<string> {
        try {
            // 尝试多个命令来检测 Node.js
            const command = 'node --version';
            
            try {
                const { stdout } = await execAsync(command);
                const version = stdout.trim().replace(/^v/, '');
                if (version) return version;
            } catch (error) {
                return null;
            }
            
            throw new Error('Node.js not found');
        } catch (error) {
            throw new Error('Node.js not found or not installed');
        }
    }

    getInstalledVersionOnMacOS(): Promise<string | null> {
        return this.getInstalledVersionOnWindows();
    }
    getInstalledVersionOnLinux(): Promise<string | null> {
        return this.getInstalledVersionOnWindows();
    }


    async getExecutablePathOnWindows(): Promise<string[] | null> {
        const commands = ['where node', 'where npx'];
        let paths:string[] = [];
        for (const command of commands) {
            const { stdout } = await execAsync(command);
            const lines = stdout.trim().split('\n');
            if (lines.length > 0 && lines[0]) {
                paths.push(lines[0].trim());
            }
        }
        return paths;
    }

    async getExecutablePathOnMacOS(): Promise<string[] | null> {
        const commands = ['which node', 'which npx'];
        let paths:string[] = [];
        for (const command of commands) {
            const { stdout } = await execAsync(command);
            const lines = stdout.trim().split('\n');
            if (lines.length > 0 && lines[0]) {
                paths.push(lines[0].trim());
            }
        }
        return paths;
    }

    getExecutablePathOnLinux(): Promise<string[] | null> {
        return this.getExecutablePathOnMacOS();
    }


    getInstallExternalLinkOnWindows() {
        return 'https://nodejs.org/en/download/';
    }
    getInstallExternalLinkOnMacOS(): string {
        return 'https://nodejs.org/en/download/';
    }
    getInstallExternalLinkOnLinux(): string {
        return 'https://nodejs.org/en/download/';
    }
}

export class PythonHandler implements RuntimeHandler {

    async getInstalledVersionOnWindows(): Promise<string | null> {
        try {
            // 尝试多个命令来检测 Python
            const commands = ['python --version', 'python3 --version', 'py --version'];
            
            for (const command of commands) {
                try {
                    const { stdout } = await execAsync(command);
                    const version = stdout.trim().replace(/^Python\s+/, '');
                    if (version) return version;
                } catch (error) {
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    getInstalledVersionOnMacOS(): Promise<string | null> {
        return this.getInstalledVersionOnWindows();
    }
    
    getInstalledVersionOnLinux(): Promise<string | null> {
        return this.getInstalledVersionOnWindows();
    }

    async getExecutablePathOnWindows(): Promise<string[] | null> {
        const commands = ['where python3', 'where uv'];
        let paths:string[] = [];
        for (const command of commands) {
            try {
                const { stdout } = await execAsync(command);
                const lines = stdout.trim().split('\n');
                if (lines.length > 0 && lines[0]) {
                    paths.push(lines[0].trim());
                }
            } catch (error) {
                continue;
            }
        }
        return paths;
    }

    async getExecutablePathOnMacOS(): Promise<string[] | null> {
        const commands = ['which python3', 'which uv'];
        let paths:string[] = [];
        
        for (const command of commands) {
            try {
                const { stdout } = await execAsync(command);
                const lines = stdout.trim().split('\n');
                if (lines.length > 0 && lines[0]) {
                    paths.push(lines[0].trim());
                }
            } catch (error) {
                continue;
            }
        }
        return paths;
    }

    getExecutablePathOnLinux(): Promise<string[] | null> {
        return this.getExecutablePathOnMacOS();
    }

    getInstallExternalLinkOnWindows(): string {
        return 'https://www.python.org/downloads/windows/';
    }
    
    getInstallExternalLinkOnMacOS(): string {
        return 'https://www.python.org/downloads/macos/';
    }
    
    getInstallExternalLinkOnLinux(): string {
        return 'https://www.python.org/downloads/source/';
    }
}



// 运行时处理器工厂
export class RuntimeHandlerFactory {
    static createHandler(runtimeName: string): RuntimeHandler {
        switch (runtimeName.toLowerCase()) {
            case 'node.js':
            case 'nodejs':
            case 'node':
                return new NodejsHandler();
            case 'python':
                return new PythonHandler();
            default:
                throw new Error(`Unsupported runtime: ${runtimeName}`);
        }
    }
}

// 运行时提供者
export class RuntimeProvider {
    private handler: RuntimeHandler;

    constructor(runtimeName: string) {
        this.handler = RuntimeHandlerFactory.createHandler(runtimeName);
    }

    async getInstalledVersion(): Promise<string | null> {
        const platform = currentPlatform;
        switch (platform) {
            case 'windows':
                return this.handler.getInstalledVersionOnWindows();
            case 'macos':
                return this.handler.getInstalledVersionOnMacOS();
            case 'linux':
                return this.handler.getInstalledVersionOnLinux();
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    getInstallExternalLink(): string {
        const platform = currentPlatform;
        switch (platform) {
            case 'windows':
                return this.handler.getInstallExternalLinkOnWindows();
            case 'macos':
                return this.handler.getInstallExternalLinkOnMacOS();
            case 'linux':
                return this.handler.getInstallExternalLinkOnLinux();
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    async getExecutablePath(): Promise<string[] | null> {
        const platform = currentPlatform;
        switch (platform) {
            case 'windows':
                return this.handler.getExecutablePathOnWindows();
            case 'macos':
                return this.handler.getExecutablePathOnMacOS();
            case 'linux':
                return this.handler.getExecutablePathOnLinux();
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}