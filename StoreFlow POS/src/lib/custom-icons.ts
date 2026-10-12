import {
  Star, Heart, Bookmark, Flag, Bell, Pin, Award, Gift, Coffee, ShoppingBag,
  Truck, ClipboardList, Calendar, Calculator, FileText, Folder, Link as LinkIcon,
  MessageCircle, Phone, Map, Camera, Music, Zap, Wrench, Briefcase, Globe,
  type LucideIcon,
} from "lucide-react";

export const CUSTOM_ICONS: Record<string, LucideIcon> = {
  Star, Heart, Bookmark, Flag, Bell, Pin, Award, Gift, Coffee, ShoppingBag,
  Truck, ClipboardList, Calendar, Calculator, FileText, Folder, Link: LinkIcon,
  MessageCircle, Phone, Map, Camera, Music, Zap, Wrench, Briefcase, Globe,
};

export const CUSTOM_ICON_NAMES = Object.keys(CUSTOM_ICONS);

export function getCustomIcon(name: string): LucideIcon {
  return CUSTOM_ICONS[name] ?? Star;
}
