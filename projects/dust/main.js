// Dust: the davit.cc hero shader as a toy. Dragging writes into a small offset field that pushes the smoke around and lets it drift back.
(()=>{
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = document.getElementById("dust");
  const gl = cv.getContext("webgl", {alpha:true, antialias:false, premultipliedAlpha:true});
  const hint = document.getElementById("hint");
  if (!gl) { hint.textContent = "This one needs WebGL, which your browser has turned off."; return; }

  const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fs = `precision highp float;
  uniform vec2 uRes; uniform float uTime; uniform sampler2D uField;
  uniform vec3 uDeep; uniform vec3 uFold; uniform vec3 uHaze; uniform vec3 uTint; uniform float uGrain; uniform float uAmt;
  float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float v=.5*vn(p);p=p*2.03+vec2(4.1,8.3);return v+.25*vn(p);}
  void main(){
    vec2 vUv=gl_FragCoord.xy/uRes;
    vec2 asp=vec2(uRes.x/max(uRes.y,1.),1.);
    float t=uTime;
    // the stir field: xy push the smoke along your stroke, z wipes a path through it like a finger through fog
    vec4 st=texture2D(uField,vUv);
    vec2 push=(st.xy-.5)*1.2;
    float wipe=st.z;
    vec2 p=vUv*asp*(1.+.075*sin(t*.33)+.035*sin(t*.13))-push;
    float w=fbm(p*.72+vec2(t*.068,-t*.044));
    vec2 q=p+.25*vec2(sin(w*6.2832+t*.6),cos(w*5.1-t*.52));
    float a=fbm(q*.86+vec2(t*.05,-t*.031));
    float b=fbm(q*1.36+vec2(-t*.045,t*.036));
    float c=fbm((q+vec2(a*.6,b*.4))*1.9-vec2(t*.031,0.));
    float extra=uAmt-wipe*.62;
    float field=a*.82+b*.42+c*.3+vn(q*3.1+t*.016)*.04+extra;
    float di=(h21(floor(gl_FragCoord.xy)+19.)-.5)*.018;
    float big=smoothstep(.38+di,.56+di,field);
    float dense=smoothstep(.46+di,.62+di,c+a*.38+extra*.8);
    float soft=smoothstep(.24+di,.58+di,b+extra*.5);
    float haze=smoothstep(.28+di,.72+di,b+a*.14+extra*.6);
    float alpha=big*.74+dense*.52+soft*.18+haze*.14;
    vec3 col=mix(uDeep,uFold,big);
    col=mix(col,uHaze,dense*.82+haze*.18);
    col+=uTint*(.28+dense*.18+haze*.12);
    vec2 g=floor(gl_FragCoord.xy);
    float grain=(h21(g)-.5)*.75+(h21(g+vec2(41.,289.))-.5)*.25;
    float gs=uGrain*(.22+alpha*.78);
    col+=grain*gs;
    alpha=clamp(alpha+grain*gs*.12,0.,1.);
    gl_FragColor=vec4(col,alpha);
  }`;
  const mk=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
  const pr=gl.createProgram();
  gl.attachShader(pr,mk(gl.VERTEX_SHADER,vs));gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr,gl.LINK_STATUS)) { hint.textContent = "Your browser couldn't draw this one."; return; }
  gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const U=k=>gl.getUniformLocation(pr,k);
  const u={res:U("uRes"),time:U("uTime"),fold:U("uFold"),haze:U("uHaze"),tint:U("uTint"),grain:U("uGrain"),amt:U("uAmt")};
  gl.uniform3f(U("uDeep"),.02,.02,.07);
  gl.uniform1i(U("uField"),0);
  gl.clearColor(0,0,0,0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

  // Stir field: a coarse grid of offsets (in hero-noise units) plus a density channel, uploaded as a small texture every frame
  const F={w:0,h:0,dx:null,dy:null,dn:null,px:null,live:0};
  const tex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const field=()=>{
    F.w=96; F.h=Math.max(24,Math.min(200,Math.round(96*innerHeight/Math.max(innerWidth,1))));
    const n=F.w*F.h; F.dx=new Float32Array(n); F.dy=new Float32Array(n); F.dn=new Float32Array(n); F.px=new Uint8Array(n*4);
    upload(true);
  };
  const upload=(fresh)=>{
    const {w,h,dx,dy,dn,px}=F;
    for(let i=0;i<w*h;i++){
      px[i*4]=Math.max(0,Math.min(255,Math.round(127.5+dx[i]/.6*127.5)));
      px[i*4+1]=Math.max(0,Math.min(255,Math.round(127.5+dy[i]/.6*127.5)));
      px[i*4+2]=Math.max(0,Math.min(255,Math.round(dn[i]*255)));
      px[i*4+3]=255;
    }
    if(fresh) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
    else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
  };
  // push the field along a stroke segment; x,y in 0..1 with y up, mx,my the move in noise units
  const splat=(x,y,mx,my,force,wipe)=>{
    const {w,h,dx,dy,dn}=F, asp=innerWidth/Math.max(innerHeight,1);
    const r=Math.min(innerWidth,innerHeight)*.072/Math.max(innerHeight,1), r2=r*r, cx=x*w, cy=y*h, rx=Math.ceil(r/asp*w*2.2), ry=Math.ceil(r*h*2.2);
    for(let j=Math.max(0,Math.floor(cy-ry));j<=Math.min(h-1,Math.ceil(cy+ry));j++){
      for(let i=Math.max(0,Math.floor(cx-rx));i<=Math.min(w-1,Math.ceil(cx+rx));i++){
        const ddx=((i+.5)/w-x)*asp, ddy=(j+.5)/h-y, k=Math.exp(-(ddx*ddx+ddy*ddy)/r2);
        if(k<.01) continue;
        const o=j*w+i;
        dx[o]=Math.max(-.6,Math.min(.6,dx[o]+mx*k*force));
        dy[o]=Math.max(-.6,Math.min(.6,dy[o]+my*k*force));
        if(wipe) dn[o]=Math.min(1,dn[o]+Math.hypot(mx,my)*k*wipe*14);
      }
    }
    F.live=1;
  };
  // let the stir spread a little and drift back to rest
  const relax=dt=>{
    if(!F.live) return;
    const {w,h,dx,dy,dn}=F, kd=Math.exp(-dt/2.2), kn=Math.exp(-dt/2.6), mixb=Math.min(.5,dt*9);
    let peak=0;
    for(let j=0;j<h;j++){
      for(let i=0;i<w;i++){
        const o=j*w+i, l=i>0?o-1:o, r=i<w-1?o+1:o, t=j>0?o-w:o, b=j<h-1?o+w:o;
        dx[o]=(dx[o]+((dx[l]+dx[r]+dx[t]+dx[b])*.25-dx[o])*mixb)*kd;
        dy[o]=(dy[o]+((dy[l]+dy[r]+dy[t]+dy[b])*.25-dy[o])*mixb)*kd;
        dn[o]=(dn[o]+((dn[l]+dn[r]+dn[t]+dn[b])*.25-dn[o])*mixb)*kn;
        peak=Math.max(peak,Math.abs(dx[o]),Math.abs(dy[o]),dn[o]);
      }
    }
    if(peak<.002){ dx.fill(0); dy.fill(0); dn.fill(0); F.live=0; }
    upload(false);
  };

  // Settings: the defaults are the ones tuned for the homepage
  const DEF={speed:.9,grain:.155,lilac:.4,amount:.5};
  const S={...DEF};
  const mixv=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);
  const apply=()=>{
    const l=S.lilac;
    gl.uniform3f(u.fold,...mixv([.47,.47,.5],[.5,.445,.78],l));
    gl.uniform3f(u.haze,...mixv([1,1,1.02],[1.025,1,1.145],l));
    gl.uniform3f(u.tint,...mixv([0,0,0],[.02,.0125,.0875],l));
    gl.uniform1f(u.grain,S.grain);
    gl.uniform1f(u.amt,(S.amount-.5)*.34-.07);
  };
  const fmt={speed:v=>v.toFixed(2)+"×",grain:v=>Math.round(v/.4*100)+"%",lilac:v=>Math.round(v*100)+"%",amount:v=>Math.round(v*100)+"%"};
  const inputs={};
  Object.keys(DEF).forEach(k=>{
    const el=document.getElementById(k), out=document.getElementById(k+"-v");
    const sync=()=>{ S[k]=parseFloat(el.value); out.textContent=fmt[k](S[k]); el.style.setProperty("--p",((S[k]-el.min)/(el.max-el.min)*100)+"%"); apply(); kick(); };
    el.addEventListener("input",sync);
    inputs[k]={el,set:v=>{el.value=v;sync()}};
  });

  let simT=Math.random()*400, last=performance.now(), raf=0;
  const draw=()=>{
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.time,simT);
    gl.drawArrays(gl.TRIANGLES,0,3);
  };
  const size=()=>{
    const d=Math.min(devicePixelRatio||1,2);
    cv.width=Math.max(1,Math.round(innerWidth*d)); cv.height=Math.max(1,Math.round(innerHeight*d));
    gl.viewport(0,0,cv.width,cv.height); gl.uniform2f(u.res,cv.width,cv.height);
    field(); draw();
  };
  const frame=now=>{
    raf=0;
    const dt=Math.min(.05,(now-last)/1000); last=now;
    simT+=dt*S.speed;
    ghostStep(dt);
    relax(dt);
    draw();
    kick();
  };
  // keep animating while it moves or while the stir is settling; pause in hidden tabs
  const kick=()=>{ if(!raf&&!document.hidden&&(S.speed>0||F.live||ghost.on)){ last=performance.now(); raf=requestAnimationFrame(frame);} else if(!raf) draw(); };
  document.addEventListener("visibilitychange",kick);

  // Pointer: moving stirs gently, dragging stirs properly
  let prev=null, down=false, touched=false;
  const at=e=>({x:e.clientX/innerWidth,y:1-e.clientY/innerHeight});
  const firstTouch=()=>{ if(touched) return; touched=true; ghost.on=false; hint.classList.add("gone"); };
  cv.addEventListener("pointerdown",e=>{ down=true; prev=at(e); cv.setPointerCapture(e.pointerId); firstTouch(); });
  cv.addEventListener("pointermove",e=>{
    const p=at(e);
    if(prev){
      const mx=(p.x-prev.x)*innerWidth/innerHeight, my=p.y-prev.y;
      if(down||e.pointerType==="mouse") splat(p.x,p.y,mx,my,down?2.2:.5,down?1:0);
      if(down) firstTouch();
    }
    prev=p; kick();
  });
  const up=()=>{ down=false; if(matchMedia("(pointer:coarse)").matches) prev=null; };
  cv.addEventListener("pointerup",up); cv.addEventListener("pointercancel",up);
  cv.addEventListener("pointerleave",()=>{ if(!down) prev=null; });

  // A ghost stroke shows that it can be stirred, until you touch it yourself
  const ghost={on:!reduce,t:0,prev:null};
  const ghostStep=dt=>{
    if(!ghost.on) return;
    ghost.t+=dt;
    const k=ghost.t-1.2;
    if(k<0) return;
    if(k>2.2){ ghost.on=false; return; }
    const s=k/2.2, x=.5+Math.sin(s*Math.PI*2)*.22, y=.52+Math.sin(s*Math.PI*4)*.12;
    if(ghost.prev) splat(x,y,(x-ghost.prev.x)*innerWidth/innerHeight,y-ghost.prev.y,1.8,.8);
    ghost.prev={x,y};
  };

  // Buttons and keys
  const ui=document.getElementById("ui"), toggle=document.getElementById("toggle");
  const flip=()=>{ const min=ui.classList.toggle("min"); toggle.textContent=min?"Tune":"Hide"; toggle.setAttribute("aria-expanded",String(!min)); };
  toggle.addEventListener("click",flip);
  addEventListener("keydown",e=>{ if((e.key==="h"||e.key==="H")&&!e.metaKey&&!e.ctrlKey&&e.target.tagName!=="INPUT") flip(); });
  document.getElementById("reset").addEventListener("click",()=>Object.keys(DEF).forEach(k=>inputs[k].set(DEF[k])));
  document.getElementById("shuffle").addEventListener("click",()=>{
    simT+=60+Math.random()*600;
    inputs.lilac.set((.15+Math.random()*.75).toFixed(2));
    inputs.amount.set((.3+Math.random()*.45).toFixed(2));
    inputs.grain.set((.08+Math.random()*.18).toFixed(3));
  });
  document.getElementById("save").addEventListener("click",()=>{
    draw();
    const out=document.createElement("canvas"); out.width=cv.width; out.height=cv.height;
    const x=out.getContext("2d"); x.fillStyle="#F6F6F9"; x.fillRect(0,0,out.width,out.height); x.drawImage(cv,0,0);
    out.toBlob(b=>{ if(!b) return; const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="davit-cc-dust.png"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); },"image/png");
  });

  if(reduce) DEF.speed=.15;
  Object.keys(DEF).forEach(k=>inputs[k].set(DEF[k]));
  size();
  addEventListener("resize",size,{passive:true});
  requestAnimationFrame(()=>{ cv.style.opacity=1; kick(); });
})();
