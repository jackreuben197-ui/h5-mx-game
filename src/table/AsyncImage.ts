/** Hide the previous bitmap until the current resource loads; invalidate replaced requests. */
export class AsyncImage {
  private key='';
  private generation=0;
  constructor(private image:HTMLImageElement) {image.hidden=true;}
  set(url:string,owner:string=''):void {
    const key=JSON.stringify([owner,url]);if(key===this.key)return;this.key=key;
    const generation=++this.generation;
    this.image.onload=this.image.onerror=null;
    this.image.hidden=true;this.image.removeAttribute('src');
    if(!url)return;
    this.image.onload=()=>{if(generation===this.generation)this.image.hidden=false;};
    this.image.onerror=()=>{if(generation===this.generation)this.image.hidden=true;};
    this.image.src=url;
  }
  destroy():void {++this.generation;this.image.onload=this.image.onerror=null;this.image.hidden=true;this.image.removeAttribute('src');}
}
