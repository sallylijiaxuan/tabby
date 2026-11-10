"use client";
import {useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Trash2} from 'lucide-react';
export function SwipeableItem({name,onRemove,children,contentClassName='item',className='',removeLabel,allowButtonSwipe=false,rowId}:{name:string;onRemove:()=>void;children:ReactNode;contentClassName?:string;className?:string;removeLabel?:string;allowButtonSwipe?:boolean;rowId?:string}){
 const [offset,setOffset]=useState(0),[dragging,setDragging]=useState(false);
 const suppressClick=useRef(false);
 const gesture=useRef<{x:number;y:number;start:number;horizontal:boolean}|null>(null);
 return <div className={`swipe-row ${className} ${offset<0?'is-open':''} ${dragging?'is-dragging':''}`} style={{'--swipe-offset':`${offset}px`} as CSSProperties}
  onClickCapture={event=>{if(suppressClick.current&&(event.target as HTMLElement).closest('.swipe-content')){event.preventDefault();event.stopPropagation();suppressClick.current=false}}}
  onTouchStart={event=>{
   if(event.touches.length!==1||!matchMedia('(max-width:900px), (max-width:1100px) and (hover:none) and (pointer:coarse)').matches)return;
   const control=(event.target as HTMLElement).closest('input,textarea,button,a');
   if(control&&!(allowButtonSwipe&&control.classList.contains('history-entry')))return;
   gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY,start:offset,horizontal:false};
  }}
  onTouchMove={event=>{
   const current=gesture.current;if(!current||event.touches.length!==1)return;
   const dx=event.touches[0].clientX-current.x,dy=event.touches[0].clientY-current.y;
   if(!current.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return}if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.4)return;current.horizontal=true;setDragging(true)}
   setOffset(Math.max(-96,Math.min(0,current.start+dx)));
  }}
  onTouchEnd={()=>{const current=gesture.current;if(current?.horizontal){setOffset(value=>value<-40?-96:0);suppressClick.current=true;setTimeout(()=>{suppressClick.current=false},350)}gesture.current=null;setDragging(false)}}
  onTouchCancel={()=>{gesture.current=null;setDragging(false);setOffset(0)}}>
  <div className="swipe-track"><button className="swipe-delete" aria-label={removeLabel||`Delete ${name}`} tabIndex={offset<0?0:-1} aria-hidden={offset===0} onClick={onRemove}><Trash2 size={18}/><span>Delete</span></button>
  <div className={`swipe-content ${contentClassName}`} data-bill-id={rowId}>{children}</div></div>
 </div>;
}
