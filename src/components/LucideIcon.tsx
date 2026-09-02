import {
 ArrowLeft,
 ArrowRight,
 ChevronDown,
 ChevronUp,
 MessageSquareText,
 Plus,
 Trash2,
} from 'lucide-react';
import type {LucideIcon as LucideIconComponent} from 'lucide-react';

const icons={
 previous:ArrowLeft,
 next:ArrowRight,
 delete:Trash2,
 add:Plus,
 expand:ChevronDown,
 collapse:ChevronUp,
 comment:MessageSquareText,
} satisfies Record<string,LucideIconComponent>;

export type LucideIconName=keyof typeof icons;

export function LucideIcon({name}:{name:LucideIconName}){
 const Icon=icons[name];
 return <Icon className="lucide-icon" aria-hidden="true"/>;
}
