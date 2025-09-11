import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  BookOpen, 
  Copy,
  ExternalLink,
  Terminal,
  Code,
  Settings,
  CheckCircle,
  Bot,
  Zap
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useConfig } from '@/hooks/use-config';
import { toast } from '@/hooks/use-toast';

// 客户端 LOGO 组件
const ClientLogo = ({ client, className = "" }: { client: string; className?: string }) => {
  const logos = {
    claude: (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm ${className}`}>
        C
      </div>
    ),
    claudecode: (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-white font-bold text-sm ${className}`}>
        CC
      </div>
    ),
    cursor: (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm ${className}`}>
        ⟫
      </div>
    ),
    vscode: (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm ${className}`}>
        VS
      </div>
    ),
    augment: (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm ${className}`}>
        A
      </div>
    ),
    others: (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white ${className}`}>
        <Settings className="h-4 w-4" />
      </div>
    )
  };
  
  return logos[client as keyof typeof logos] || logos.others;
};

export default function SetupGuide() {
  const navigate = useNavigate();
  const { currentLanguage } = useI18n();
  const { getConfig } = useConfig();
  const [copiedConfig, setCopiedConfig] = useState<string | null>(null);
  const [portNumber, setPortNumber] = useState<number>(7195);

  // 读取端口配置
  useEffect(() => {
    const loadPort = async () => {
      const config = await getConfig();
      if (config?.general?.portNumber) {
        setPortNumber(config.general.portNumber);
      }
    };
    loadPort();
  }, [getConfig]);

  const handleBack = () => {
    navigate('/settings');
  };

  const copyToClipboard = (text: string, configType: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedConfig(configType);
      toast({
        title: currentLanguage === 'zh-CN' ? '已复制到剪贴板' : 'Copied to clipboard',
        description: currentLanguage === 'zh-CN' ? '配置代码已复制' : 'Configuration code copied',
      });
      setTimeout(() => setCopiedConfig(null), 2000);
    });
  };

  const mcpMoreAlias = "x";

  const mcpConfigurationJson = {
    "mcpServers": {
      [mcpMoreAlias]: {
        "url": `http://localhost:${portNumber}/mcp`
      }
    }
  };

  const mcpConfigJsonString = JSON.stringify(mcpConfigurationJson, null, 2);

  const content = {
    'zh-CN': {
      title: 'MCP 客户端设置向导',
      subtitle: '选择您的 MCP 客户端，按照指引完成配置',
      tabs: {
        claude: 'Claude Desktop',
        claudecode: 'Claude Code',
        cursor: 'Cursor',
        vscode: 'VS Code',
        augment: 'Augment Code',
        others: '其他客户端'
      },
      claude: {
        title: 'Claude Desktop 配置',
        description: '为 Claude Desktop 应用配置 MCP 服务器连接',
        steps: [
          {
            title: '1. 定位配置文件',
            content: '找到 Claude Desktop 的配置文件位置：',
            paths: {
              windows: 'Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
              mac: 'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
              linux: 'Linux: ~/.config/Claude/claude_desktop_config.json'
            }
          },
          {
            title: '2. 编辑配置文件',
            content: '打开配置文件，添加以下 MCP 服务器配置：',
            config: mcpConfigJsonString
          },
          {
            title: '3. 重启 Claude Desktop',
            content: '保存配置文件后，完全退出并重新启动 Claude Desktop 应用。'
          },
          {
            title: '4. 验证配置',
            content: '在 Claude 中输入消息，如果配置成功，您将看到 MCP 工具可用的提示。'
          }
        ]
      },
      claudecode: {
        title: 'Claude Code 配置',
        description: '为 Claude Code CLI 工具配置 MCP 服务器连接',
        steps: [
          {
            title: '1. 使用命令行添加 MCP 服务器',
            content: '使用 Claude Code CLI 添加 MCP More 服务器：',
            config: `claude mcp add-json ${mcpMoreAlias} '${JSON.stringify({
              "url": `http://localhost:${portNumber}/mcp`
            })}'`
          },
          {
            title: '2. 验证服务器配置',
            content: '列出所有已配置的 MCP 服务器：',
            config: 'claude mcp list'
          },
          {
            title: '3. 测试服务器连接',
            content: '测试 MCP More 服务器连接：',
            config: `claude mcp test ${mcpMoreAlias}`
          },
          {
            title: '4. 项目级配置（可选）',
            content: '在项目目录中创建 .claude/settings.local.json 文件进行项目级配置：',
            config: `{
  "mcpServers": {
    "${mcpMoreAlias}": {
      "url": "http://localhost:${portNumber}/mcp"
    }
  }
}`
          }
        ]
      },
      cursor: {
        title: 'Cursor 编辑器配置',
        description: '为 Cursor AI 编辑器配置 MCP 服务器支持',
        steps: [
          {
            title: '1. 安装 MCP 扩展',
            content: '在 Cursor 扩展商店中搜索并安装 "MCP Client" 扩展。'
          },
          {
            title: '2. 打开设置',
            content: '按 Ctrl/Cmd + , 打开设置，搜索 "MCP" 相关设置。'
          },
          {
            title: '3. 配置服务器',
            content: '在 MCP 设置中添加服务器配置：',
            config: mcpConfigJsonString
          },
          {
            title: '4. 重载窗口',
            content: '按 Ctrl/Cmd + Shift + P，执行 "Developer: Reload Window" 重载编辑器。'
          }
        ]
      },
      vscode: {
        title: 'VS Code 配置',
        description: '为 Visual Studio Code 配置 MCP 服务器集成',
        steps: [
          {
            title: '1. 安装扩展',
            content: '从 VS Code 扩展商店安装 "Model Context Protocol" 扩展。'
          },
          {
            title: '2. 配置工作区',
            content: '在项目根目录创建 .vscode/settings.json 文件：',
            config: `{
  "mcp.servers": {
    "${mcpMoreAlias}": {
      "url": "http://localhost:${portNumber}/mcp"
    }
  },
  "mcp.enableAutoStart": true
}`
          },
          {
            title: '3. 验证连接',
            content: '查看输出面板的 "MCP" 频道，确认服务器连接状态。'
          }
        ]
      },
      augment: {
        title: 'Augment Code 配置',
        description: '为 Augment Code AI 编程助手配置 MCP 服务器连接',
        steps: [
          {
            title: '1. 打开 Augment 设置面板',
            content: '在 Augment 面板右上角打开选项菜单，点击 Settings 选项。'
          },
          {
            title: '2. 选择配置方式',
            content: 'Augment Code 提供三种配置 MCP 服务器的方式：Easy MCP（推荐）、设置面板手动配置、JSON 导入配置。'
          },
          {
            title: '3. 使用 JSON 导入配置',
            content: '在设置面板中选择 "Import from JSON"，粘贴以下配置：',
            config: mcpConfigJsonString
          },
          {
            title: '4. 验证配置',
            content: '配置完成后，您可以在设置面板中编辑或删除服务器，确认 MCP More 服务器连接正常。'
          }
        ]
      },
      others: {
        title: '其他 MCP 客户端',
        description: '适用于其他支持 MCP 协议的客户端和工具',
        clients: [
          {
            name: 'Continue',
            description: 'VS Code 中的 AI 编程助手',
            configPath: '~/.continue/config.json',
            config: `{
  "mcpServers": {
    "${mcpMoreAlias}": {
      "url": "http://localhost:${portNumber}/mcp"
    }
  }
}`
          },
          {
            name: 'Zed',
            description: '高性能代码编辑器',
            configPath: '~/.config/zed/settings.json',
            config: `{
  "mcp": {
    "servers": {
      "${mcpMoreAlias}": {
        "url": "http://localhost:${portNumber}/mcp"
      }
    }
  }
}`
          },
          {
            name: '自定义客户端',
            description: '使用 MCP SDK 构建的自定义客户端',
            configPath: '按客户端文档配置',
            config: `// 示例：Node.js MCP 客户端
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport("http://localhost:${portNumber}/mcp");

const client = new Client({
  name: "my-client",
  version: "1.0.0"
});

await client.connect(transport);`
          }
        ]
      }
    },
    'en-US': {
      title: 'MCP Client Setup Guide',
      subtitle: 'Choose your MCP client and follow the guide to complete the configuration',
      tabs: {
        claude: 'Claude Desktop',
        claudecode: 'Claude Code',
        cursor: 'Cursor',
        vscode: 'VS Code',
        augment: 'Augment Code',
        others: 'Other Clients'
      },
      claude: {
        title: 'Claude Desktop Configuration',
        description: 'Configure MCP server connections for Claude Desktop application',
        steps: [
          {
            title: '1. Locate Configuration File',
            content: 'Find the Claude Desktop configuration file location:',
            paths: {
              windows: 'Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
              mac: 'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
              linux: 'Linux: ~/.config/Claude/claude_desktop_config.json'
            }
          },
          {
            title: '2. Edit Configuration File',
            content: 'Open the configuration file and add the following MCP server configuration:',
            config: mcpConfigJsonString
          },
          {
            title: '3. Restart Claude Desktop',
            content: 'After saving the configuration file, completely exit and restart the Claude Desktop application.'
          },
          {
            title: '4. Verify Configuration',
            content: 'Type a message in Claude. If configured successfully, you should see prompts indicating MCP tools are available.'
          }
        ]
      },
      claudecode: {
        title: 'Claude Code Configuration',
        description: 'Configure MCP server connections for Claude Code CLI tool',
        steps: [
          {
            title: '1. Add MCP Server via Command Line',
            content: 'Use Claude Code CLI to add MCP More server:',
            config: `claude mcp add-json ${mcpMoreAlias} '${JSON.stringify({
              "url": `http://localhost:${portNumber}/mcp`
            })}'`
          },
          {
            title: '2. Verify Server Configuration',
            content: 'List all configured MCP servers:',
            config: 'claude mcp list'
          },
          {
            title: '3. Test Server Connection',
            content: 'Test MCP More server connection:',
            config: `claude mcp test ${mcpMoreAlias}`
          },
          {
            title: '4. Project-level Configuration (Optional)',
            content: 'Create .claude/settings.local.json file in project directory for project-level configuration:',
            config: `{
  "mcpServers": {
    "${mcpMoreAlias}": {
      "url": "http://localhost:${portNumber}/mcp"
    }
  }
}`
          }
        ]
      },
      cursor: {
        title: 'Cursor Editor Configuration',
        description: 'Configure MCP server support for Cursor AI editor',
        steps: [
          {
            title: '1. Install MCP Extension',
            content: 'Search and install "MCP Client" extension from the Cursor extension marketplace.'
          },
          {
            title: '2. Open Settings',
            content: 'Press Ctrl/Cmd + , to open settings, search for "MCP" related settings.'
          },
          {
            title: '3. Configure Servers',
            content: 'Add server configuration in MCP settings:',
            config: mcpConfigJsonString
          },
          {
            title: '4. Reload Window',
            content: 'Press Ctrl/Cmd + Shift + P, execute "Developer: Reload Window" to reload the editor.'
          }
        ]
      },
      vscode: {
        title: 'VS Code Configuration',
        description: 'Configure MCP server integration for Visual Studio Code',
        steps: [
          {
            title: '1. Install Extension',
            content: 'Install the "Model Context Protocol" extension from VS Code extension marketplace.'
          },
          {
            title: '2. Configure Workspace',
            content: 'Create .vscode/settings.json file in project root:',
            config: `{
  "mcp.servers": {
    "${mcpMoreAlias}": {
      "url": "http://localhost:${portNumber}/mcp"
    }
  },
  "mcp.enableAutoStart": true
}`
          },
          {
            title: '3. Verify Connection',
            content: 'Check the "MCP" channel in the output panel to confirm server connection status.'
          }
        ]
      },
      augment: {
        title: 'Augment Code Configuration',
        description: 'Configure MCP server connections for Augment Code AI programming assistant',
        steps: [
          {
            title: '1. Open Augment Settings Panel',
            content: 'Open the options menu in the upper right of the Augment panel and click the Settings option.'
          },
          {
            title: '2. Choose Configuration Method',
            content: 'Augment Code provides three ways to configure MCP servers: Easy MCP (recommended), Settings Panel manual configuration, and JSON import configuration.'
          },
          {
            title: '3. Use JSON Import Configuration',
            content: 'In the settings panel, select "Import from JSON" and paste the following configuration:',
            config: mcpConfigJsonString
          },
          {
            title: '4. Verify Configuration',
            content: 'After configuration, you can edit or remove servers in the settings panel to confirm that the MCP More server connection is working properly.'
          }
        ]
      },
      others: {
        title: 'Other MCP Clients',
        description: 'For other clients and tools that support MCP protocol',
        clients: [
          {
            name: 'Continue',
            description: 'AI programming assistant in VS Code',
            configPath: '~/.continue/config.json',
            config: `{
  "mcpServers": {
    "${mcpMoreAlias}": {
      "url": "http://localhost:${portNumber}/mcp"
    }
  }
}`
          },
          {
            name: 'Zed',
            description: 'High-performance code editor',
            configPath: '~/.config/zed/settings.json',
            config: `{
  "mcp": {
    "servers": {
      "${mcpMoreAlias}": {
        "url": "http://localhost:${portNumber}/mcp"
      }
    }
  }
}`
          },
          {
            name: 'Custom Client',
            description: 'Custom client built with MCP SDK',
            configPath: 'Configure according to client documentation',
            config: `// Example: Node.js MCP Client
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport("http://localhost:${portNumber}/mcp");

const client = new Client({
  name: "my-client",
  version: "1.0.0"
});

await client.connect(transport);`
          }
        ]
      }
    }
  };

  const lang = currentLanguage === 'zh-CN' ? 'zh-CN' : 'en-US';
  const data = content[lang];

  return (
    <div className="flex-1 p-6 space-y-6 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {data.title}
          </h1>
          <p className="text-muted-foreground">
            {data.subtitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Tabs defaultValue="claude" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="claude" className="flex flex-col items-center gap-2 p-4 h-auto">
              <ClientLogo client="claude" />
              <span className="text-xs">{data.tabs.claude}</span>
            </TabsTrigger>
            <TabsTrigger value="claudecode" className="flex flex-col items-center gap-2 p-4 h-auto">
              <ClientLogo client="claudecode" />
              <span className="text-xs">{data.tabs.claudecode}</span>
            </TabsTrigger>
            <TabsTrigger value="cursor" className="flex flex-col items-center gap-2 p-4 h-auto">
              <ClientLogo client="cursor" />
              <span className="text-xs">{data.tabs.cursor}</span>
            </TabsTrigger>
            <TabsTrigger value="vscode" className="flex flex-col items-center gap-2 p-4 h-auto">
              <ClientLogo client="vscode" />
              <span className="text-xs">{data.tabs.vscode}</span>
            </TabsTrigger>
            <TabsTrigger value="augment" className="flex flex-col items-center gap-2 p-4 h-auto">
              <ClientLogo client="augment" />
              <span className="text-xs">{data.tabs.augment}</span>
            </TabsTrigger>
            <TabsTrigger value="others" className="flex flex-col items-center gap-2 p-4 h-auto">
              <ClientLogo client="others" />
              <span className="text-xs">{data.tabs.others}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ClientLogo client="claude" className="w-6 h-6" />
                  {data.claude.title}
                </CardTitle>
                <CardDescription>{data.claude.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.claude.steps.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">{step.content}</p>
                    
                    {step.paths && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="font-mono text-sm">{step.paths.windows}</div>
                        <div className="font-mono text-sm">{step.paths.mac}</div>
                        <div className="font-mono text-sm">{step.paths.linux}</div>
                      </div>
                    )}

                    {step.config && (
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                          <code>{step.config}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(step.config!, `claude-${index}`)}
                        >
                          {copiedConfig === `claude-${index}` ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claudecode" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ClientLogo client="claudecode" className="w-6 h-6" />
                  {data.claudecode.title}
                </CardTitle>
                <CardDescription>{data.claudecode.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.claudecode.steps.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">{step.content}</p>
                    
                    {step.config && (
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                          <code>{step.config}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(step.config!, `claudecode-${index}`)}
                        >
                          {copiedConfig === `claudecode-${index}` ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cursor" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ClientLogo client="cursor" className="w-6 h-6" />
                  {data.cursor.title}
                </CardTitle>
                <CardDescription>{data.cursor.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.cursor.steps.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">{step.content}</p>
                    
                    {step.config && (
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                          <code>{step.config}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(step.config!, `cursor-${index}`)}
                        >
                          {copiedConfig === `cursor-${index}` ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vscode" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ClientLogo client="vscode" className="w-6 h-6" />
                  {data.vscode.title}
                </CardTitle>
                <CardDescription>{data.vscode.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.vscode.steps.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">{step.content}</p>
                    
                    {step.config && (
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                          <code>{step.config}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(step.config!, `vscode-${index}`)}
                        >
                          {copiedConfig === `vscode-${index}` ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="augment" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ClientLogo client="augment" className="w-6 h-6" />
                  {data.augment.title}
                </CardTitle>
                <CardDescription>{data.augment.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.augment.steps.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">{step.content}</p>
                    
                    {step.config && (
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                          <code>{step.config}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(step.config!, `augment-${index}`)}
                        >
                          {copiedConfig === `augment-${index}` ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="others" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ClientLogo client="others" className="w-6 h-6" />
                  {data.others.title}
                </CardTitle>
                <CardDescription>{data.others.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.others.clients.map((client, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{client.name}</h3>
                      <Badge variant="secondary">{client.configPath}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{client.description}</p>
                    
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                        <code>{client.config}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(client.config, `other-${index}`)}
                      >
                        {copiedConfig === `other-${index}` ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}