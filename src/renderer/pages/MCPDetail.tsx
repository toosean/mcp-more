import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Star, 
  Calendar, 
  User, 
  Package, 
  FileText,
  Shield,
  Globe,
  Github,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const mockMCPs = [
  {
    id: '1',
    name: 'File Manager Pro',
    description: 'Advanced file system operations with support for cloud storage providers. Features batch operations, intelligent search, and secure file handling.',
    author: 'DevTools Inc',
    version: '2.1.0',
    downloads: 15420,
    rating: 4.8,
    tags: ['file-system', 'cloud', 'productivity', 'automation'],
    fullDescription: 'File Manager Pro is a comprehensive file management solution that extends your system\'s capabilities with advanced features. It provides seamless integration with popular cloud storage providers including AWS S3, Google Drive, and Dropbox. The package includes intelligent file search, batch operations for handling multiple files simultaneously, and robust security features to protect your data.',
    features: [
      'Multi-cloud storage support (AWS S3, Google Drive, Dropbox)',
      'Batch file operations with progress tracking',
      'Advanced search with metadata indexing',
      'File encryption and security scanning',
      'Automated backup and sync capabilities',
      'REST API for programmatic access'
    ],
    requirements: [
      'Node.js 16.0 or higher',
      'At least 100MB free disk space',
      'Internet connection for cloud features'
    ],
    license: 'MIT',
    homepage: 'https://filemanager-pro.dev',
    repository: 'https://github.com/devtools/file-manager-pro',
    lastUpdated: '2024-01-15',
    changelog: [
      {
        version: '2.1.0',
        date: '2024-01-15',
        changes: [
          'Added support for Dropbox integration',
          'Improved search performance by 40%',
          'Fixed memory leak in batch operations',
          'Updated security protocols'
        ]
      },
      {
        version: '2.0.5',
        date: '2024-01-01',
        changes: [
          'Bug fixes for Google Drive sync',
          'Enhanced error handling',
          'UI improvements'
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Database Connector',
    description: 'Universal database connectivity for PostgreSQL, MySQL, MongoDB, and more. Includes query optimization and connection pooling.',
    author: 'DataFlow',
    version: '1.5.2',
    downloads: 12890,
    rating: 4.6,
    tags: ['database', 'sql', 'nosql', 'connector'],
    fullDescription: 'Database Connector provides a unified interface for connecting to multiple database systems. It supports both SQL and NoSQL databases with optimized connection pooling and query caching.',
    features: [
      'Support for PostgreSQL, MySQL, MongoDB, Redis',
      'Connection pooling and management',
      'Query optimization and caching',
      'Transaction management',
      'Database migration tools',
      'Real-time monitoring and analytics'
    ],
    requirements: [
      'Node.js 14.0 or higher',
      'Database server access',
      'Minimum 50MB RAM'
    ],
    license: 'Apache 2.0',
    homepage: 'https://db-connector.io',
    repository: 'https://github.com/dataflow/db-connector',
    lastUpdated: '2024-01-10',
    changelog: [
      {
        version: '1.5.2',
        date: '2024-01-10',
        changes: [
          'Added Redis support',
          'Improved connection pooling',
          'Fixed timeout issues'
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'API Gateway',
    description: 'Seamless REST and GraphQL API integration with authentication, rate limiting, and response caching capabilities.',
    author: 'NetCore Labs',
    version: '3.0.1',
    downloads: 8750,
    rating: 4.9,
    tags: ['api', 'rest', 'graphql', 'gateway'],
    fullDescription: 'API Gateway is a powerful middleware solution for managing API requests and responses. It provides comprehensive features for API security, performance optimization, and developer experience.',
    features: [
      'REST and GraphQL support',
      'JWT authentication and authorization',
      'Rate limiting and throttling',
      'Response caching and compression',
      'API documentation generation',
      'Request/response transformation'
    ],
    requirements: [
      'Node.js 16.0 or higher',
      'Redis for caching (optional)',
      'SSL certificates for HTTPS'
    ],
    license: 'MIT',
    homepage: 'https://api-gateway.dev',
    repository: 'https://github.com/netcore/api-gateway',
    lastUpdated: '2024-01-20',
    changelog: [
      {
        version: '3.0.1',
        date: '2024-01-20',
        changes: [
          'Enhanced GraphQL support',
          'Improved rate limiting algorithms',
          'Added new authentication methods'
        ]
      }
    ]
  },
  {
    id: '4',
    name: 'ML Model Hub',
    description: 'Deploy and manage machine learning models with built-in inference endpoints and model versioning.',
    author: 'AI Solutions',
    version: '1.8.0',
    downloads: 6420,
    rating: 4.7,
    tags: ['ml', 'ai', 'inference', 'models'],
    fullDescription: 'ML Model Hub provides a complete platform for deploying and managing machine learning models in production. It supports multiple ML frameworks and provides scalable inference capabilities.',
    features: [
      'Support for TensorFlow, PyTorch, scikit-learn',
      'Model versioning and rollback',
      'Auto-scaling inference endpoints',
      'A/B testing for models',
      'Performance monitoring',
      'Batch and real-time predictions'
    ],
    requirements: [
      'Python 3.8 or higher',
      'Docker for containerization',
      'Minimum 2GB RAM for inference'
    ],
    license: 'BSD 3-Clause',
    homepage: 'https://ml-hub.ai',
    repository: 'https://github.com/ai-solutions/ml-hub',
    lastUpdated: '2024-01-18',
    changelog: [
      {
        version: '1.8.0',
        date: '2024-01-18',
        changes: [
          'Added PyTorch 2.0 support',
          'Improved model loading performance',
          'New monitoring dashboard'
        ]
      }
    ]
  },
  {
    id: '5',
    name: 'Notification Center',
    description: 'Multi-channel notification system supporting email, SMS, push notifications, and webhooks.',
    author: 'MessageFlow',
    version: '2.3.1',
    downloads: 9830,
    rating: 4.5,
    tags: ['notifications', 'email', 'sms', 'webhooks'],
    fullDescription: 'Notification Center is a comprehensive notification management system that handles multiple communication channels. It provides reliable delivery, template management, and analytics.',
    features: [
      'Email, SMS, and push notifications',
      'Webhook integration',
      'Template management system',
      'Delivery tracking and analytics',
      'Retry logic and failover',
      'Real-time notification status'
    ],
    requirements: [
      'Node.js 16.0 or higher',
      'SMTP server for email',
      'SMS provider API keys'
    ],
    license: 'MIT',
    homepage: 'https://notification-center.com',
    repository: 'https://github.com/messageflow/notification-center',
    lastUpdated: '2024-01-12',
    changelog: [
      {
        version: '2.3.1',
        date: '2024-01-12',
        changes: [
          'Improved SMS delivery rates',
          'Added new email templates',
          'Fixed webhook retry logic'
        ]
      }
    ]
  },
  {
    id: '6',
    name: 'Security Scanner',
    description: 'Automated security vulnerability scanning with real-time threat detection and compliance reporting.',
    author: 'CyberGuard',
    version: '1.2.0',
    downloads: 4590,
    rating: 4.8,
    tags: ['security', 'scanning', 'compliance', 'threats'],
    fullDescription: 'Security Scanner provides comprehensive security assessment capabilities for applications and infrastructure. It includes vulnerability scanning, compliance checking, and real-time threat detection.',
    features: [
      'Automated vulnerability scanning',
      'OWASP compliance checking',
      'Real-time threat detection',
      'Security report generation',
      'Integration with CI/CD pipelines',
      'Custom security rules and policies'
    ],
    requirements: [
      'Node.js 16.0 or higher',
      'Docker for containerized scanning',
      'Network access to target systems'
    ],
    license: 'Commercial',
    homepage: 'https://security-scanner.pro',
    repository: 'https://github.com/cyberguard/security-scanner',
    lastUpdated: '2024-01-22',
    changelog: [
      {
        version: '1.2.0',
        date: '2024-01-22',
        changes: [
          'Added new vulnerability signatures',
          'Improved scanning speed by 30%',
          'Enhanced compliance reporting'
        ]
      }
    ]
  }
];

export default function MCPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const mcp = mockMCPs.find(m => m.id === id);
  
  if (!mcp) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Package Not Found</h1>
          <p className="text-muted-foreground">The requested MCP package could not be found.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Market
          </Button>
        </div>
      </div>
    );
  }

  const handleInstall = () => {
    toast({
      title: "Installing MCP",
      description: `${mcp.name} is being installed...`,
    });
  };

  const handleBackToMarket = () => {
    navigate('/');
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackToMarket}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {mcp.name}
          </h1>
          <p className="text-muted-foreground">
            by {mcp.author} • v{mcp.version}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{mcp.fullDescription}</p>
              
              <div className="flex flex-wrap gap-2">
                {mcp.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {mcp.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {mcp.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{requirement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Changelog */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mcp.changelog.map((version) => (
                <div key={version.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{version.version}</Badge>
                    <span className="text-sm text-muted-foreground">{version.date}</span>
                  </div>
                  <ul className="space-y-1 ml-4">
                    {version.changes.map((change, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {change}
                      </li>
                    ))}
                  </ul>
                  {version !== mcp.changelog[mcp.changelog.length - 1] && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Install Package</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleInstall}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4 mr-2" />
                Install {mcp.name}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Version {mcp.version} • {mcp.downloads.toLocaleString()} downloads
              </div>
            </CardContent>
          </Card>

          {/* Package Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Package Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Author</span>
                  </div>
                  <span className="text-sm font-medium">{mcp.author}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Version</span>
                  </div>
                  <Badge variant="outline">{mcp.version}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm">Rating</span>
                  </div>
                  <span className="text-sm font-medium">{mcp.rating}/5.0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Downloads</span>
                  </div>
                  <span className="text-sm font-medium">{mcp.downloads.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Updated</span>
                  </div>
                  <span className="text-sm font-medium">{mcp.lastUpdated}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">License</span>
                  </div>
                  <Badge variant="secondary">{mcp.license}</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <a href={mcp.homepage} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Homepage
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <a href={mcp.repository} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    Repository
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}