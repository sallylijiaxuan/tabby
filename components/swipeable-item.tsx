"use client";
import {useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Trash2} from 'lucide-react';
export function SwipeableItem({name,onRemove,children}:{name:string;onRemove:()=>void;children:ReactNode}){
 const [offset,setOffset]=useState(0),[dragging,setDragging]=useState(false);
 const gesture=useRef<{x:number;y:number;start:number;horizontal:boolean}|null>(null);
 return <div className={`swipe-row ${offset<0?'is-open':''} ${dragging?'is-dragging':''}`} style={{'--swipe-offset':`${offset}px`} as CSSProperties}
  onTouchStart={event=>{
   if(event.touches.length!==1||!matchMedia('(max-width:900px), (max-width:1100px) and (hover:none) and (pointer:coarse)').matches)return;
   if((event.target as HTMLElement).closest('input,textarea,button,a'))return;
   gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY,start:offset,horizontal:false};
  }}
  onTouchMove={event=>{
   const current=gesture.current;if(!current||event.touches.length!==1)return;
   const dx=event.touches[0].clientX-current.x,dy=event.touches[0].clientY-current.y;
   if(!current.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return}if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.4)return;current.horizontal=true;setDragging(true)}
   setOffset(Math.max(-96,Math.min(0,current.start+dx)));
  }}
  onTouchEnd={()=>{const current=gesture.current;if(current?.horizontal)setOffset(value=>value<-40?-96:0);gesture.current=null;setDragging(false)}}
  onTouchCancel={()=>{gesture.current=null;setDragging(false);setOffset(0)}}>
  <button className="swipe-delete" aria-label={`Delete ${name}`} tabIndex={offset<0?0:-1} aria-hidden={offset===0} onClick={onRemove}><Trash2 size={18}/><span>Delete</span></button>
  <div className="item">{children}</div>
 </div>;
}
