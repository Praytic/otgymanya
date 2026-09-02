const icons={
 previous:'2B05',
 next:'27A1',
 delete:'1F5D1',
 add:'2795',
 expand:'2B07',
 collapse:'2B06',
 comment:'1F4D3',
} as const;

export type EmojiIconName=keyof typeof icons;

export function EmojiIcon({name}:{name:EmojiIconName}){
 return <img className="emoji-icon" src={`/openmoji/${icons[name]}.svg`} alt="" aria-hidden="true"/>;
}
