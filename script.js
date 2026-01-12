const SUPABASE_URL = "https://dighhvbolrsinqyxjjno.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2hodmJvbHJzaW5xeXhqam5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTMyNzgsImV4cCI6MjA4Mzc4OTI3OH0.LNAnFg1RnTeiTusy9qCD7_u-ik9ZETNrZTA6QZ7sKUQ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase SDK:", window.supabase);

const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");
const color=document.getElementById("color");
const size=document.getElementById("size");
const upload=document.getElementById("upload");

const drawBtn=document.getElementById("drawBtn");
const eraseBtn=document.getElementById("eraseBtn");
const stickerBtn=document.getElementById("stickerBtn");
const clearBtn=document.getElementById("clearBtn");

let drawing=false, mode="draw";
let stickers=[], dragIndex=-1;

function pos(e){
  const r=canvas.getBoundingClientRect();
  if(e.touches) return {x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
  return {x:e.clientX-r.left,y:e.clientY-r.top};
}

function canvasToBlob() {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), "image/png");
  });
}

function start(e){
  const p=pos(e);
  if(mode==="sticker"){
    dragIndex=stickers.findIndex(s=>p.x>s.x&&p.x<s.x+s.w&&p.y>s.y&&p.y<s.y+s.h);
  }else{
    drawing=true;
    ctx.beginPath();
    ctx.moveTo(p.x,p.y);
  }
}

function draw(e){
  const p=pos(e);
  if(mode==="draw"&&drawing){
    ctx.globalCompositeOperation="source-over";
    ctx.strokeStyle=color.value;
    ctx.lineWidth=size.value;
    ctx.lineCap="round";
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
  }
  if(mode==="erase"&&drawing){
    ctx.globalCompositeOperation="destination-out";
    ctx.lineWidth=size.value;
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
  }
  if(mode==="sticker"&&dragIndex!=-1){
    stickers[dragIndex].x=p.x-stickers[dragIndex].w/2;
    stickers[dragIndex].y=p.y-stickers[dragIndex].h/2;
    redraw();
  }
}

function stop(){drawing=false;dragIndex=-1;}

canvas.addEventListener("mousedown",start);
canvas.addEventListener("mousemove",draw);
canvas.addEventListener("mouseup",stop);
canvas.addEventListener("touchstart",start);
canvas.addEventListener("touchmove",draw);
canvas.addEventListener("touchend",stop);

upload.onchange=function(){
  const file=this.files[0];
  const img=new Image();
  img.onload=()=>{stickers.push({img,x:60,y:60,w:70,h:70});redraw();}
  img.src=URL.createObjectURL(file);
};

function redraw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  stickers.forEach(s=>ctx.drawImage(s.img,s.x,s.y,s.w,s.h));
}

drawBtn.onclick=()=>mode="draw";
eraseBtn.onclick=()=>mode="erase";
stickerBtn.onclick=()=>mode="sticker";
clearBtn.onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);stickers=[];}

// ดาวความพึงพอใจ
const stars=document.querySelectorAll("#stars span");
let rating=0;
stars.forEach(star=>{
  star.onclick=()=>{
    rating=star.dataset.v;
    stars.forEach(s=>{
      s.classList.remove("active");
      if(s.dataset.v<=rating) s.classList.add("active");
    });
  };
});

const submitBtn = document.getElementById("submitBtn");
const statusText = document.getElementById("status");

submitBtn.onclick = async () => {
  if (rating === 0) {
    alert("กรุณาให้คะแนนก่อน ⭐");
    return;
  }

  statusText.innerText = "⏳ กำลังส่งข้อมูล...";

  try {
    // 1. Convert canvas to image
    const blob = await canvasToBlob();
    const fileName = `art_${Date.now()}.png`;

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from("image")
      .upload(fileName, blob, {
        contentType: "image/png"
      });

    if (uploadError) throw uploadError;

    // 3. Get public URL
    const { data: publicUrl } = supabase
      .storage
      .from("image")
      .getPublicUrl(fileName);

    // 4. Insert feedback data
    const { error: insertError } = await supabase
      .from("feedback")
      .insert({
        star: rating,
        comment: document.getElementById("comment").value,
        image_url: publicUrl.publicUrl
      });

    if (insertError) throw insertError;

    statusText.innerText = "✅ ส่งเรียบร้อย ขอบคุณครับ 💖";

    // Optional: reset
    ctx.clearRect(0,0,canvas.width,canvas.height);
    document.getElementById("comment").value = "";
    rating = 0;
    stars.forEach(s => s.classList.remove("active"));

  } catch (err) {
    console.error(err);
    statusText.innerText = "❌ เกิดข้อผิดพลาด กรุณาลองใหม่";
  }
};