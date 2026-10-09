(()=>{
  const clock=document.getElementById("clock");
  const tick=()=>{try{clock.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tbilisi",hour:"2-digit",minute:"2-digit"}).format(new Date())}catch(e){}};
  tick(); setInterval(tick,15000);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Headline: wrap each word so it can rise in on load
  const hl=document.getElementById("headline"); let wi=0;
  const wrap=node=>{[...node.childNodes].forEach(n=>{
    if(n.nodeType===3){const f=document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part=>{ if(!part) return;
        if(/^\s+$/.test(part)) f.appendChild(document.createTextNode(part));
        else {const sp=document.createElement("span");sp.className="w";sp.style.setProperty("--i",wi++);sp.textContent=part;f.appendChild(sp);} });
      n.replaceWith(f);
    } else if(n.nodeType===1) wrap(n);
  })};
  wrap(hl);

  // Nav turns to frosted glass once you scroll
  const nw=document.getElementById("navwrap");
  const onScroll=()=>nw.classList.toggle("scrolled",scrollY>24);
  onScroll(); addEventListener("scroll",onScroll,{passive:true});

  // Hero dust: warped value-noise folds drawn as see-through lavender-grey shapes over a flat page, grain strongest inside the folds
  const cv = document.getElementById("shader");
  const gl = cv.getContext("webgl", {alpha:true, antialias:false, premultipliedAlpha:true});
  if (gl) {
    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `precision highp float;
    uniform vec2 uRes; uniform float uTime;
    uniform vec2 uPtr; uniform float uPtrOn; uniform float uPtrR;
    uniform vec3 uDeep; uniform vec3 uFold; uniform vec3 uHaze; uniform vec3 uTint; uniform float uGrain;
    float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float v=.5*vn(p);p=p*2.03+vec2(4.1,8.3);return v+.25*vn(p);}
    void main(){
      vec2 vUv=gl_FragCoord.xy/uRes;
      vec2 asp=vec2(uRes.x/max(uRes.y,1.),1.);
      float t=uTime;
      vec2 p=vUv*asp*(1.+.075*sin(t*.33)+.035*sin(t*.13));
      // warp the space, then layer three folds; the third rides on the first two
      float w=fbm(p*.72+vec2(t*.068,-t*.044));
      vec2 q=p+.25*vec2(sin(w*6.2832+t*.6),cos(w*5.1-t*.52));
      float a=fbm(q*.86+vec2(t*.05,-t*.031));
      float b=fbm(q*1.36+vec2(-t*.045,t*.036));
      float c=fbm((q+vec2(a*.6,b*.4))*1.9-vec2(t*.031,0.));
      // a wobbly fold grows around the hovered link
      vec2 d=vUv*asp-uPtr*asp;
      float ang=atan(d.y,d.x);
      float wob=(vn(vec2(ang*1.3+t*.08,t*.05+2.7))*.6+vn(vec2(ang*1.9-t*.05,t*.035+7.4))*.4)-.5;
      float r=uPtrR*(1.+wob*.18);
      float ptr=(1.-smoothstep(r*.12,r*1.34,length(d*vec2(.94,1.06))))*(.14+vn(d*6.+t*.1)*.1)*uPtrOn;
      float field=a*.82+b*.42+c*.3+vn(q*3.1+t*.016)*.04+ptr;
      float di=(h21(floor(gl_FragCoord.xy)+19.)-.5)*.018;
      float big=smoothstep(.38+di,.56+di,field);
      float dense=smoothstep(.46+di,.62+di,c+a*.38+ptr*.9);
      float soft=smoothstep(.24+di,.58+di,b+ptr*.35);
      float haze=smoothstep(.28+di,.72+di,b+a*.14+ptr*.42);
      // fade out toward the bottom of the hero
      float fade=smoothstep(0.,.84,vUv.y);
      fade*=1.-(1.-smoothstep(0.,.34,vUv.y))*.48;
      float alpha=(big*.74+dense*.52+soft*.18+haze*.14)*fade;
      vec3 col=mix(uDeep,uFold,big);
      col=mix(col,uHaze,dense*.82+haze*.18);
      col+=uTint*(.28+dense*.18+haze*.12);
      vec2 g=floor(gl_FragCoord.xy);
      float grain=(h21(g)-.5)*.75+(h21(g+vec2(41.,289.))-.5)*.25;
      float gs=uGrain*(.22+alpha*.78);
      col+=grain*gs;
      col+=vec3(.03,.03,.045)*ptr;
      alpha=clamp(alpha+grain*gs*.12+ptr*.05,0.,1.);
      gl_FragColor=vec4(col,alpha);
    }`;
    const mk=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
    const pr=gl.createProgram();
    gl.attachShader(pr,mk(gl.VERTEX_SHADER,vs));gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
    if (gl.getProgramParameter(pr,gl.LINK_STATUS)) {
      gl.useProgram(pr);
      const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const U=k=>gl.getUniformLocation(pr,k);
      const u={res:U("uRes"),time:U("uTime"),ptr:U("uPtr"),on:U("uPtrOn"),r:U("uPtrR")};
      // palette: lavender-grey folds and white haze, tuned with Davit
      gl.uniform3f(U("uDeep"),.02,.02,.07);
      gl.uniform3f(U("uFold"),.48,.46,.62);
      gl.uniform3f(U("uHaze"),1.01,1.,1.07);
      gl.uniform3f(U("uTint"),.008,.005,.035);
      gl.uniform1f(U("uGrain"),.155);
      gl.clearColor(0,0,0,0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      const speed=.9, t0=performance.now()-Math.random()*30000;
      const ptr={x:.5,y:.22,tx:.5,ty:.22,on:0,ton:0,r:.24,tr:.24};
      const draw=(now,ease)=>{
        if(ease){ ptr.x+=(ptr.tx-ptr.x)*.12; ptr.y+=(ptr.ty-ptr.y)*.12; ptr.on+=(ptr.ton-ptr.on)*.075; ptr.r+=(ptr.tr-ptr.r)*.075; }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(u.time,(now-t0)/1000*speed);
        gl.uniform2f(u.ptr,ptr.x,ptr.y); gl.uniform1f(u.on,ptr.on); gl.uniform1f(u.r,ptr.r);
        gl.drawArrays(gl.TRIANGLES,0,3);
      };
      const size=()=>{const d=Math.min(devicePixelRatio||1,2);cv.width=Math.max(1,Math.round(cv.clientWidth*d));cv.height=Math.max(1,Math.round(cv.clientHeight*d));gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(u.res,cv.width,cv.height);draw(performance.now(),false)};
      size(); addEventListener("resize",size,{passive:true});
      // hovering a nav or hero link grows a fold around it
      const targets=".navwrap a, .hero a";
      let hover=null;
      const aim=(el,e)=>{
        const c=cv.getBoundingClientRect(), b=el.getBoundingClientRect();
        let x=b.left+b.width/2, y=b.top+b.height/2;
        if(e){ x+=Math.max(-1,Math.min(1,(e.clientX-x)/Math.max(b.width/2,1)))*22; y+=Math.max(-1,Math.min(1,(e.clientY-y)/Math.max(b.height/2,1)))*22; }
        ptr.tx=Math.max(0,Math.min(1,(x-c.left)/c.width));
        ptr.ty=1-Math.max(0,Math.min(1,(y-c.top)/c.height));
      };
      document.addEventListener("pointerover",e=>{
        const el=e.target.closest&&e.target.closest(targets);
        if(!el||el===hover) return;
        const c=cv.getBoundingClientRect(), b=el.getBoundingClientRect();
        if(!hover&&ptr.on<.05){ aim(el,e); ptr.x=ptr.tx; ptr.y=ptr.ty; }
        hover=el; aim(el,e);
        ptr.tr=Math.max(.16,Math.min(.42,Math.max(1.7*b.width/c.width,1.4*b.height/c.height)));
        ptr.ton=1;
      },{passive:true});
      document.addEventListener("pointerout",e=>{
        const el=e.target.closest&&e.target.closest(targets);
        const to=e.relatedTarget&&e.relatedTarget.closest?e.relatedTarget.closest(targets):null;
        if(el&&el===hover&&!to){ hover=null; ptr.ton=0; }
      },{passive:true});
      document.addEventListener("pointermove",e=>{ if(hover&&e.target.closest&&e.target.closest(targets)===hover) aim(hover,e); },{passive:true});
      let visible=true, running=false, last=0;
      const frame=now=>{
        running=false;
        if(now-last>=1000/60-1){ last=now; draw(now,true); }
        loop();
      };
      const loop=()=>{ if(!reduce && visible && !document.hidden && !running){ running=true; requestAnimationFrame(frame);} };
      new IntersectionObserver(es=>{visible=es[0].isIntersecting;loop()}).observe(cv);
      document.addEventListener("visibilitychange",loop);
      requestAnimationFrame(now=>{draw(now,false); cv.classList.add("on"); loop();});
    } else { cv.remove(); }
  } else { cv.remove(); }

  // Project art stays grey until hovered; on touch screens it colours in while the card sits in the middle of the screen
  if(matchMedia("(hover: none)").matches){
    const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle("lit",e.isIntersecting)),{rootMargin:"-30% 0px -30% 0px"});
    document.querySelectorAll(".wcard").forEach(c=>io.observe(c));
  }

  // Playground tile previews: small 2D sketches of each experiment, animated only while on screen
  const grain=(()=>{const g=document.createElement("canvas");g.width=g.height=128;const gx=g.getContext("2d"),im=gx.createImageData(128,128);
    for(let i=0;i<im.data.length;i+=4){const n=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=n;im.data[i+3]=34;}gx.putImageData(im,0,0);return g})();
  const shibaImg=new Image(); shibaImg.src="/favicon.svg";
  const heartPath=(x,cx,cy,s)=>{x.beginPath();x.moveTo(cx,cy+s*.9);x.bezierCurveTo(cx-s*1.3,cy,cx-s*.9,cy-s*.9,cx,cy-s*.35);x.bezierCurveTo(cx+s*.9,cy-s*.9,cx+s*1.3,cy,cx,cy+s*.9);x.closePath()};
  // Shiba Land: a tiny four-shade lavender screen, drawn at 80×72 and scaled up crisply
  const GB=["#E9E8FC","#B9B7E6","#6A68A8","#24233F"];
  const DOG=["..3....3..",".313..313.",".31133113.","3111111113","3131111313","3001111003",".30033003.","..300003..","...3333..."];
  const lowres=document.createElement("canvas"); lowres.width=80; lowres.height=72; const lx=lowres.getContext("2d");
  const drawLand=tm=>{
    const s=tm/1000, scroll=s*14;
    lx.fillStyle=GB[0]; lx.fillRect(0,0,80,72);
    lx.fillStyle=GB[1];
    for(let i=-1;i<4;i++){const hx=i*34-(scroll*.3)%34;lx.beginPath();lx.ellipse(hx+17,52,18,12,0,Math.PI,0);lx.fill()}
    lx.fillStyle=GB[1]; for(let i=-1;i<3;i++){const cx=i*46-(scroll*.15)%46+10;lx.fillRect(cx,12,12,3);lx.fillRect(cx+3,9,6,3)}
    for(let i=-1;i<12;i++){const bx=Math.floor(i*8-scroll%8);
      lx.fillStyle=GB[2];lx.fillRect(bx,58,8,14);lx.fillStyle=GB[3];lx.fillRect(bx,58,8,1);lx.fillRect(bx+7,58,1,14);lx.fillRect(bx,64,8,1)}
    const px=Math.floor(46-(scroll%96)); lx.fillStyle=GB[2]; for(let k=0;k<3;k++){lx.fillRect(px+k*8,34,7,7)} lx.fillStyle=GB[3];for(let k=0;k<3;k++){lx.strokeStyle=GB[3];lx.strokeRect(px+k*8+.5,34.5,6,6)}
    const bxp=Math.floor(px+8+2), byp=26+Math.round(Math.sin(s*4)*1.5); lx.fillStyle=GB[3];lx.fillRect(bxp,byp,5,2);lx.fillRect(bxp-1,byp-1,2,1);lx.fillRect(bxp-1,byp+2,2,1);lx.fillRect(bxp+4,byp-1,2,1);lx.fillRect(bxp+4,byp+2,2,1);lx.fillStyle=GB[0];lx.fillRect(bxp+1,byp,3,1);
    const ph=(s*1.1)%1, jump=ph<.45?Math.sin(ph/.45*Math.PI)*16:0, dx=18, dy=Math.round(49-jump);
    DOG.forEach((row,j)=>[...row].forEach((ch,i)=>{if(ch==="."||ch===" ")return;lx.fillStyle=GB[+ch];lx.fillRect(dx+i,dy+j,1,1)}));
    if(ph>=.45&&Math.floor(s*8)%2){lx.fillStyle=GB[3];lx.fillRect(dx+2,dy+9,2,1);lx.fillRect(dx+6,dy+9,2,1)}
  };
  document.querySelectorAll(".ptile canvas").forEach(c=>{
    const x=c.getContext("2d"); let w,h,d=Math.min(devicePixelRatio||1,2);
    const fit=()=>{w=c.clientWidth;h=c.clientHeight;c.width=w*d;c.height=h*d;x.setTransform(d,0,0,d,0,0)};
    fit();
    const kind=c.dataset.kind;
    const blobs=Array.from({length:5},(_,i)=>({a:Math.random()*6.3,b:Math.random()*6.3,r:.45+Math.random()*.35,sp:.12+i*.03}));
    // only animate while the tile is on screen
    let shown=false, raf=0;
    const frame=tm=>{
      raf=0;
      const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,"#18181C");g.addColorStop(1,"#26262E");
      x.fillStyle=g;x.fillRect(0,0,w,h);
      const s=tm/1000;
      if(kind==="invaders"){
        const cols=6,rows=3,cell=Math.min(w/9,22),off=Math.sin(tm/700)*cell;
        x.fillStyle="#B9B7E6";
        for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
          const px=w/2-cols*cell+k*cell*2+off, py=h*.18+r*cell*1.6;
          x.fillRect(px,py,cell*1.1,cell*.7);x.fillRect(px+cell*.2,py+cell*.7,cell*.2,cell*.3);x.fillRect(px+cell*.7,py+cell*.7,cell*.2,cell*.3);
        }
        const sx=w/2+Math.sin(tm/900)*w*.3, sz=cell*1.5;
        x.fillStyle="#fff";x.fillRect(sx-1.5,h*.6-((tm/4)%(h*.4)),3,10);
        if(shibaImg.complete&&shibaImg.naturalWidth)x.drawImage(shibaImg,sx-sz/2,h*.62,sz,sz);
      } else if(kind==="dust"){
        x.globalCompositeOperation="lighter";
        blobs.forEach((b,i)=>{
          const cx=w*(.5+.36*Math.sin(s*b.sp+b.a)), cy=h*(.45+.3*Math.cos(s*b.sp*1.3+b.b)), r=Math.max(w,h)*b.r;
          const rg=x.createRadialGradient(cx,cy,0,cx,cy,r);
          rg.addColorStop(0,i%2?"rgba(185,183,230,.34)":"rgba(150,148,205,.3)");rg.addColorStop(1,"rgba(185,183,230,0)");
          x.fillStyle=rg;x.fillRect(0,0,w,h);
        });
        x.globalCompositeOperation="source-over";
        x.save();x.translate(-Math.random()*128,-Math.random()*128);x.fillStyle=x.createPattern(grain,"repeat");x.fillRect(0,0,w+128,h+128);x.restore();
      } else if(kind==="shiba"){
        const sz=Math.min(w,h)*.46, cx=w/2, cy=h*.42+Math.sin(s*2.2)*4;
        x.save();x.translate(cx,cy+sz*.4);x.rotate(Math.sin(s*1.1)*.12);
        if(shibaImg.complete&&shibaImg.naturalWidth)x.drawImage(shibaImg,-sz/2,-sz*.9,sz,sz*56/58);
        x.restore();
        for(let i=0;i<3;i++){const k=(s*.45+i/3)%1, hx=cx+(i-1)*sz*.42+Math.sin(k*6+i)*8, hy=cy-sz*.5-k*h*.22;
          x.globalAlpha=Math.sin(k*Math.PI)*.9;x.fillStyle="#F2A7B5";heartPath(x,hx,hy,7+i*1.5);x.fill();x.globalAlpha=1}
      } else if(kind==="land"){
        drawLand(tm);
        const sw=Math.min(w*.7,(h-150)*80/72), sh=sw*72/80, sx=(w-sw)/2, sy=Math.max(58,(h-sh)/2-34);
        x.fillStyle="#34333F";x.beginPath();x.roundRect?x.roundRect(sx-12,sy-12,sw+24,sh+24,12):x.rect(sx-12,sy-12,sw+24,sh+24);x.fill();
        x.imageSmoothingEnabled=false;x.drawImage(lowres,sx,sy,sw,sh);x.imageSmoothingEnabled=true;
        x.fillStyle="#F2A7B5";x.beginPath();x.arc(sx-4,sy+sh*.3,2.2,0,7);x.fill();
      }
      if(!reduce&&shown&&!document.hidden&&!raf)raf=requestAnimationFrame(frame);
    };
    const go=()=>{ if(!raf&&shown) raf=requestAnimationFrame(frame); };
    new IntersectionObserver(es=>{shown=es[0].isIntersecting;go()}).observe(c);
    document.addEventListener("visibilitychange",go);
    addEventListener("resize",()=>{ fit(); if(!raf) raf=requestAnimationFrame(frame); });
    shibaImg.addEventListener("load",()=>{ if(!raf) raf=requestAnimationFrame(frame); });
    raf=requestAnimationFrame(frame);
  });
})();
