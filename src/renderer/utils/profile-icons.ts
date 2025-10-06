import {
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
  Package
} from 'lucide-react';

// Available icon mapping for profiles
export const AVAILABLE_ICONS = {
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

/**
 * 获取图标组件
 * @param iconName - 图标名称
 * @returns 图标组件，如果未找到则返回 Settings
 */
export const getIconComponent = (iconName?: string) => {
  if (!iconName || !(iconName in AVAILABLE_ICONS)) {
    return Settings; // Default icon
  }
  return AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS];
};
