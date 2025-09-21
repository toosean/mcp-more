import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Settings,
  Play,
  Pause,
  Clock,
  CheckCircle,
  Circle,
  Package,
  User,
  UserCheck,
  UserCog,
  UserX,
  Briefcase,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Server,
  Database,
  Globe,
  Code,
  Terminal,
  Zap,
  Star,
  Heart,
  Home,
  Building,
  Car,
  Plane,
  Rocket
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { useProfiles } from '@/hooks/use-profiles';
import { useConfig } from '@/hooks/use-config';
import { Mcp, Profile } from 'src/config/types';

// 可用的图标映射
const AVAILABLE_ICONS = {
  Settings,
  User,
  UserCheck,
  UserCog,
  UserX,
  Briefcase,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Server,
  Database,
  Globe,
  Code,
  Terminal,
  Zap,
  Star,
  Heart,
  Home,
  Building,
  Car,
  Plane,
  Rocket,
  Package,
};

// 图标名称数组
const ICON_NAMES = Object.keys(AVAILABLE_ICONS) as (keyof typeof AVAILABLE_ICONS)[];

// 获取图标组件
const getIconComponent = (iconName?: string) => {
  if (!iconName || !(iconName in AVAILABLE_ICONS)) {
    return User; // 默认图标
  }
  return AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS];
};

export default function Profiles() {
  const { t } = useI18n();
  const { getConfig } = useConfig();
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    assignMcpToProfile,
    removeMcpFromProfile,
    getInstalledMcps,
    clearError,
  } = useProfiles();

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Partial<Profile>>({});
  const [availableMcps, setAvailableMcps] = useState<Mcp[]>([]);
  const [portNumber, setPortNumber] = useState<number>(7195);

  // 加载端口配置
  useEffect(() => {
    const loadPortConfig = async () => {
      try {
        const config = await getConfig();
        if (config?.general?.portNumber) {
          setPortNumber(config.general.portNumber);
        }
      } catch (err) {
        window.logAPI.error('Failed to load port config:', err);
      }
    };
    loadPortConfig();
  }, [getConfig]);

  // 加载可用的 MCP 服务器
  useEffect(() => {
    const loadMcps = async () => {
      const mcps = await getInstalledMcps();
      setAvailableMcps(mcps);
    };
    loadMcps();
  }, [getInstalledMcps]);

  // 设置默认选中的 Profile
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(profiles[0]);
    }
  }, [profiles, selectedProfile]);

  // 当profiles更新时，同步更新selectedProfile
  useEffect(() => {
    if (selectedProfile && profiles.length > 0) {
      const updatedProfile = profiles.find(p => p.id === selectedProfile.id);
      if (updatedProfile) {
        setSelectedProfile(updatedProfile);
      }
    }
  }, [profiles, selectedProfile]);

  // 过滤 profiles
  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (profile.description && profile.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  // 生成有效的Profile ID
  const generateProfileId = (name: string): string => {
    // 清理名称：只保留a-z, A-Z, 0-9, -, _ 字符
    // 示例：
    // "My Client 1" -> "my-client-1"
    // "Test@#$Client" -> "test-client"
    // "客户端 1" -> "1"
    // "---test---" -> "test"
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-') // 将无效字符替换为-
      .replace(/^-+|-+$/g, '') // 移除开头和结尾的-
      .replace(/-+/g, '-'); // 将连续的-合并为单个-

    // 如果清理后为空，使用默认前缀
    const baseId = cleanName || 'profile-' + Date.now();

    return baseId;
  };

  // 检查Profile名称是否已存在
  const checkDuplicateName = (name: string): boolean => {
    return profiles.some(profile =>
      profile.name.toLowerCase() === name.toLowerCase()
    );
  };

  // 检查Profile ID是否已存在
  const checkDuplicateId = (id: string): boolean => {
    return profiles.some(profile => profile.id === id);
  };

  // 生成唯一的Profile ID
  const generateUniqueProfileId = (name: string): string => {
    const baseId = generateProfileId(name);

    // 如果ID不存在，直接返回
    if (!checkDuplicateId(baseId)) {
      return baseId;
    }

    // 如果存在，添加数字后缀
    let counter = 1;
    let uniqueId = `${baseId}-${counter}`;

    while (checkDuplicateId(uniqueId)) {
      counter++;
      uniqueId = `${baseId}-${counter}`;
    }

    return uniqueId;
  };

  // 创建新 Profile
  const handleCreateProfile = async () => {
    if (!editingProfile.name) {
      toast({
        title: t('profiles.validation.nameRequired'),
        description: t('profiles.validation.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    // 检查名称是否重复
    if (checkDuplicateName(editingProfile.name)) {
      toast({
        title: t('profiles.validation.nameExists'),
        description: t('profiles.validation.nameExistsDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // 生成唯一的Profile ID
      const uniqueId = generateUniqueProfileId(editingProfile.name);

      const newProfile = await createProfile({
        id: uniqueId,
        name: editingProfile.name,
        description: editingProfile.description || '',
        icon: editingProfile.icon || ICON_NAMES[0],
        mcpIdentifiers: editingProfile.mcpIdentifiers || [],
      });

      setEditingProfile({});
      setIsCreateDialogOpen(false);
      toast({
        title: t('profiles.toast.created.title'),
        description: t('profiles.toast.created.description', { name: editingProfile.name }) + ` (ID: ${newProfile.id})`,
      });
    } catch (err) {
      toast({
        title: t('profiles.toast.createFailed.title'),
        description: t('profiles.toast.createFailed.description'),
        variant: 'destructive',
      });
    }
  };

  // 更新 Profile
  const handleUpdateProfile = async () => {
    if (!selectedProfile || !editingProfile) return;

    // 检查名称是否为空
    if (!editingProfile.name) {
      toast({
        title: t('profiles.validation.nameRequired'),
        description: t('profiles.validation.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    // 检查名称是否重复（排除当前编辑的Profile）
    if (editingProfile.name !== selectedProfile.name && checkDuplicateName(editingProfile.name)) {
      toast({
        title: t('profiles.validation.nameExists'),
        description: t('profiles.validation.nameExistsDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('selectedProfile', selectedProfile, editingProfile);
      await updateProfile(selectedProfile.id, editingProfile);
      setEditingProfile({});
      setIsEditDialogOpen(false);

      toast({
        title: t('profiles.toast.updated.title'),
        description: t('profiles.toast.updated.description', { name: editingProfile.name || selectedProfile.name }),
      });
    } catch (err) {
      toast({
        title: t('profiles.toast.updateFailed.title'),
        description: t('profiles.toast.updateFailed.description'),
        variant: 'destructive',
      });
    }
  };

  // 复制 Profile URL 到剪贴板
  const handleCopyProfileUrl = async (profile: Profile) => {
    const url = `http://localhost:${portNumber}/${profile.id}/mcp`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'URL Copied',
        description: `Profile URL has been copied to clipboard: ${url}`,
      });
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy URL to clipboard',
        variant: 'destructive',
      });
    }
  };

  // 删除 Profile
  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;

    try {
      await deleteProfile(profileToDelete.id);

      if (selectedProfile?.id === profileToDelete.id) {
        setSelectedProfile(profiles.find(p => p.id !== profileToDelete.id) || null);
      }

      setProfileToDelete(null);
      setIsDeleteDialogOpen(false);

      toast({
        title: t('profiles.toast.deleted.title'),
        description: t('profiles.toast.deleted.description', { name: profileToDelete.name }),
      });
    } catch (err) {
      toast({
        title: t('profiles.toast.deleteFailed.title'),
        description: t('profiles.toast.deleteFailed.description'),
        variant: 'destructive',
      });
    }
  };

  // 切换 MCP 分配
  const toggleMcpAssignment = async (mcpIdentifier: string) => {
    if (!selectedProfile) return;

    try {
      const isAssigned = selectedProfile.mcpIdentifiers.includes(mcpIdentifier);

      if (isAssigned) {
        await removeMcpFromProfile(selectedProfile.id, mcpIdentifier);
      } else {
        await assignMcpToProfile(selectedProfile.id, mcpIdentifier);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update MCP assignment',
        variant: 'destructive',
      });
    }
  };

  // 显示加载状态
  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-destructive">{error}</div>
          <Button onClick={clearError} variant="outline">
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('profiles.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('profiles.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Profile</DialogTitle>
                <DialogDescription>
                  Create a new profile to organize your MCP servers.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {ICON_NAMES.map((iconName) => {
                      const IconComponent = AVAILABLE_ICONS[iconName];
                      const isSelected = editingProfile.icon === iconName;
                      return (
                        <Button
                          key={iconName}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-1"
                          onClick={() => setEditingProfile(prev => ({ ...prev, icon: iconName }))}
                        >
                          <IconComponent className="h-4 w-4" />
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {editingProfile.icon || ICON_NAMES[0]}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    value={editingProfile.name || ''}
                    onChange={(e) => setEditingProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter profile name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingProfile.description || ''}
                    onChange={(e) => setEditingProfile(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter profile description..."
                    rows={3}
                  />
                </div>

              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProfile}>
                  Create Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Profiles ({filteredProfiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border-t ${
                    selectedProfile?.id === profile.id
                      ? 'bg-primary/5'
                      : ''
                  }`}
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = getIconComponent(profile.icon);
                          return <IconComponent className="h-4 w-4 text-primary" />;
                        })()}
                        <h3 className="font-semibold">{profile.name}</h3>
                      </div>
                      <Badge variant="outline">
                        {profile.mcpIdentifiers.length} MCP{profile.mcpIdentifiers.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {profile.description}
                    </p>

                    {/* <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(profile.lastUsed)}
                      </div>
                      <div>
                        {profile.id}
                      </div>
                    </div> */}
                  </div>
                </div>
              ))}

              {filteredProfiles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No profiles found</p>
                  <p className="text-sm">Create your first profile to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProfile ? (
            <>
              {/* Profile Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = getIconComponent(selectedProfile.icon);
                          return <IconComponent className="h-5 w-5 text-primary" />;
                        })()}
                        {selectedProfile.name}
                      </CardTitle>
                      <CardDescription>{selectedProfile.description}</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProfile(selectedProfile);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setProfileToDelete(selectedProfile);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground">Profile URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-muted p-2 rounded flex-1">
                          http://localhost:{portNumber}/{selectedProfile.id}/mcp
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyProfileUrl(selectedProfile)}
                        >
                          📋
                        </Button>
                      </div>
                    </div>

                    {/* <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Profile ID</Label>
                        <p className="font-mono">{selectedProfile.id}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">MCP Count</Label>
                        <p>{selectedProfile.mcpIdentifiers.length} server{selectedProfile.mcpIdentifiers.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Icon</Label>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = getIconComponent(selectedProfile.icon);
                            return <IconComponent className="h-4 w-4 text-primary" />;
                          })()}
                          <span>{selectedProfile.icon || 'User'}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Created</Label>
                        <p>{formatTime(selectedProfile.createdAt)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Updated</Label>
                        <p>{formatTime(selectedProfile.updatedAt)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Used</Label>
                        <p>{formatTime(selectedProfile.lastUsed)}</p>
                      </div>
                    </div> */}
                  </div>
                </CardContent>
              </Card>

              {/* MCP Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('profiles.sections.mcpAssignment')}</CardTitle>
                  <CardDescription>
                    {t('profiles.sections.mcpAssignmentHint')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableMcps.map((mcp) => {
                      const isAssigned = selectedProfile.mcpIdentifiers.includes(mcp.identifier);
                      return (
                        <Card
                          key={mcp.identifier}
                          className={`cursor-pointer transition-all duration-200 ${
                            isAssigned
                              ? 'ring-2 ring-primary bg-primary/5'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => toggleMcpAssignment(mcp.identifier)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className='flex-1'>
                                  {isAssigned ? (
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium">{mcp.name}</h4>
                                  <p className="text-sm text-muted-foreground" title={mcp.description || '暂无描述'}>
                                    {(mcp.description && mcp.description.length > 40)
                                      ? mcp.description.slice(0, 40) + '...'
                                      : (mcp.description || '暂无描述')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {availableMcps.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No MCP servers installed</p>
                      <p className="text-sm">Install MCP servers from the Market first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Profile Selected</h3>
                <p className="text-muted-foreground text-center">
                  Select a profile from the list to view and edit its configuration
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {ICON_NAMES.map((iconName) => {
                  const IconComponent = AVAILABLE_ICONS[iconName];
                  const isSelected = editingProfile.icon === iconName;
                  return (
                    <Button
                      key={iconName}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-1"
                      onClick={() => setEditingProfile(prev => ({ ...prev, icon: iconName }))}
                    >
                      <IconComponent className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {editingProfile.icon || ICON_NAMES[0]}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Profile Name</Label>
              <Input
                id="edit-name"
                value={editingProfile.name || ''}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter profile name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingProfile.description || ''}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter profile description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingProfile({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the profile "{profileToDelete?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}