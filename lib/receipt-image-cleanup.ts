/** Local adaptive threshold removes uneven paper shadows before OCR. */
export function cleanReceiptImage(canvas:HTMLCanvasElement){
 const context=canvas.getContext('2d');if(!context)return;
 const w=canvas.width,h=canvas.height,frame=context.getImageData(0,0,w,h),data=frame.data;
 const gray=new Uint8Array(w*h),integral=new Float64Array((w+1)*(h+1));
 for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){const i=y*w+x;gray[i]=Math.round(data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114);sum+=gray[i];integral[(y+1)*(w+1)+x+1]=sum+integral[y*(w+1)+x+1]}}
 const radius=24;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const x1=Math.max(0,x-radius),x2=Math.min(w,x+radius+1),y1=Math.max(0,y-radius),y2=Math.min(h,y+radius+1);
  const mean=(integral[y2*(w+1)+x2]-integral[y1*(w+1)+x2]-integral[y2*(w+1)+x1]+integral[y1*(w+1)+x1])/((x2-x1)*(y2-y1));
  const value=gray[y*w+x]<mean-12?0:255,i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=value;
 }
 context.putImageData(frame,0,0);
}
