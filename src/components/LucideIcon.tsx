import {
 ArrowLeft,
 ArrowRight,
 ChevronDown,
 ChevronUp,
 MessageSquareText,
 Minus,
 Plus,
 Repeat,
 Trash2,
 Undo2,
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
 minus:Minus,
 replace:Repeat,
 undo:Undo2,
} satisfies Record<string,LucideIconComponent>;

export type LucideIconName=keyof typeof icons;

export function LucideIcon({name}:{name:LucideIconName}){
 const Icon=icons[name];
 return <Icon className="lucide-icon" fill="none" aria-hidden="true"/>;
}
