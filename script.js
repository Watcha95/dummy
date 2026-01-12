const SUPABASE_URL = "https://dighhvbolrsinqyxjjno.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2hodmJvbHJzaW5xeXhqam5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTMyNzgsImV4cCI6MjA4Mzc4OTI3OH0.LNAnFg1RnTeiTusy9qCD7_u-ik9ZETNrZTA6QZ7sKUQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase SDK:", window.supabase);

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const color = document.getElementById("color");
const size = document.getElementById("size");
const upload = document.getElementById("upload");

const drawBtn = document.getElementById("drawBtn");
const eraseBtn = document.getElementById("eraseBtn");
const stickerBtn = document.getElementById("stickerBtn");
const clearBtn = document.getElementById("clearBtn");
let activeIndex = -1;
let strokes = [];
let dragging = false;
let resizing = false;

let drawing = false,
  mode = "draw";
let stickers = [],
  dragIndex = -1;

function pos(e) {
  const r = canvas.getBoundingClientRect();
  if (e.touches)
    return {
      x: e.touches[0].clientX - r.left,
      y: e.touches[0].clientY - r.top,
    };
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function canvasToBlob() {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function start(e) {
  const p = pos(e);

  if (mode === "sticker") {
    // deselect by default
    activeIndex = -1;
    dragging = false;
    resizing = false;

    // check stickers from top to bottom
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];

      // check resize handle first
      if (onResizeHandle(p, s)) {
        activeIndex = i;
        resizing = true;
        return; // stop here
      }

      // check if inside sticker → drag
      if (
        p.x > s.x && p.x < s.x + s.w &&
        p.y > s.y && p.y < s.y + s.h
      ) {
        activeIndex = i;
        dragging = true;
        redraw();
        return; // stop here
      }
    }

    // click outside stickers → deselect
    redraw();

  } else if (mode === "draw") {
    // start new stroke
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);

    strokes.push({
      color: color.value,
      width: size.value,
      points: [{ x: p.x, y: p.y }]
    });

  } else if (mode === "erase") {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);

    strokes.push({
      color: "erase", // special flag for erase
      width: size.value,
      points: [{ x: p.x, y: p.y }]
    });
  }
}


function draw(e) {
  const p = pos(e);

  if (mode === "draw" && drawing) {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color.value;
    ctx.lineWidth = size.value;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // save the stroke points
    strokes[strokes.length - 1].points.push({ x: p.x, y: p.y });
  }

  if (mode === "erase" && drawing) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = size.value;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  if (mode === "sticker" && activeIndex !== -1) {
    const s = stickers[activeIndex];

    if (dragging) {
      s.x = p.x - s.w / 2;
      s.y = p.y - s.h / 2;
      redraw();
    }

    if (resizing) {
      s.w = Math.max(30, p.x - s.x);
      s.h = Math.max(30, p.y - s.y);
      redraw();
    }
  }
}

function stop() {
  drawing = false;
  dragging = false;
  resizing = false;
}

canvas.addEventListener("mousedown", start);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stop);
canvas.addEventListener("touchstart", start);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", stop);
canvas.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});
canvas.style.cursor = mode === "sticker" ? "move" : "crosshair";


upload.onchange = function () {
  const file = this.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    stickers.push({
      img,
      x: 60,
      y: 60,
      w: 80,
      h: 80,
      resizing: false,
    });
    redraw();
  };
  img.src = URL.createObjectURL(file);
};

document.querySelectorAll("#emojiStickers button").forEach((btn) => {
  btn.onclick = () => addEmojiSticker(btn.dataset.emoji);
});

function addEmojiSticker(emoji) {
  const size = 64;
  const off = document.createElement("canvas");
  off.width = off.height = size;
  const octx = off.getContext("2d");

  octx.font = "48px system-ui";
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.fillText(emoji, size / 2, size / 2);

  const img = new Image();
  img.onload = () => {
    stickers.push({
      img,
      x: 80,
      y: 80,
      w: 80,
      h: 80,
    });
    activeIndex = stickers.length - 1;
    redraw();
  };
  img.src = off.toDataURL();
}

function onResizeHandle(p, s) {
  const size = 14;
  return (
    p.x > s.x + s.w - size &&
    p.x < s.x + s.w &&
    p.y > s.y + s.h - size &&
    p.y < s.y + s.h
  );
}

function setMode(m) {
  mode = m;

  // hide sticker selection when changing mode
  activeIndex = -1;  
  dragging = false;
  resizing = false;

  redraw(); // refresh canvas to remove border

  // update active button highlight
  document.querySelectorAll("button").forEach(b => b.classList.remove("active"));
  if (m === "draw") drawBtn.classList.add("active");
  if (m === "erase") eraseBtn.classList.add("active");
  if (m === "sticker") stickerBtn.classList.add("active");
}


function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1️⃣ redraw all previous strokes
  strokes.forEach(stroke => {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  });

  // 2️⃣ redraw all stickers
  stickers.forEach((s, i) => {
    ctx.drawImage(s.img, s.x, s.y, s.w, s.h);

    if (mode === "sticker" && i === activeIndex) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(s.x + s.w - 14, s.y + s.h - 14, 14, 14);
    }
  });
}


drawBtn.onclick = () => (mode = "draw");
eraseBtn.onclick = () => (mode = "erase");
stickerBtn.onclick = () => (mode = "sticker");
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stickers = [];
};

// ดาวความพึงพอใจ
const stars = document.querySelectorAll("#stars span");
let rating = 0;
stars.forEach((star) => {
  star.onclick = () => {
    rating = star.dataset.v;
    stars.forEach((s) => {
      s.classList.remove("active");
      if (s.dataset.v <= rating) s.classList.add("active");
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
    redraw(); // draw stickers onto canvas

    const blob = await canvasToBlob();
    const fileName = `art_${Date.now()}.png`;

    // 1️⃣ Upload image
    const { error: uploadError } = await supabaseClient.storage
      .from("image")
      .upload(fileName, blob, {
        contentType: "image/png",
      });

    if (uploadError) throw uploadError;

    // 2️⃣ Get public URL (STORAGE, not DB)
    const { data } = supabaseClient.storage
      .from("image")
      .getPublicUrl(fileName);

    // 3️⃣ Insert feedback
    const { error: insertError } = await supabaseClient
      .from("feedback")
      .insert({
        star: rating,
        comment: document.getElementById("comment").value,
        image_url: data.publicUrl,
      });

    if (insertError) throw insertError;

    statusText.innerText = "✅ ส่งเรียบร้อย ขอบคุณครับ 💖";

    // reset
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stickers = [];
    document.getElementById("comment").value = "";
    rating = 0;
    stars.forEach((s) => s.classList.remove("active"));
  } catch (err) {
    console.error(err);
    statusText.innerText = "❌ เกิดข้อผิดพลาด กรุณาลองใหม่";
  }
};

const tableBody = document.getElementById("feedbackTable");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const totalCountText = document.getElementById("totalCount");
const avgScoreText = document.getElementById("avgScore");

let page = 1;
const PAGE_SIZE = 10;
let totalCount = 0;

// Load data
async function loadFeedback() {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabaseClient
    .from("feedback")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error(error);
    return;
  }

  totalCount = count;
  totalCountText.innerText = totalCount;

  pageInfo.innerText = `หน้า ${page} / ${Math.ceil(totalCount / PAGE_SIZE)}`;

  renderTable(data);
  loadStats();
}

// Render table rows
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <img src="${row.image_url}" width="60" style="border-radius:8px"/>
      </td>
      <td>${row.star} ⭐</td>
      <td>${row.comment || "-"}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// Load total + average score
async function loadStats() {
  const { data, error } = await supabaseClient.from("feedback").select("star");

  if (error) return;

  const total = data.length;
  const sum = data.reduce((acc, r) => acc + r.star, 0);
  const avg = total ? (sum / total).toFixed(2) : 0;

  avgScoreText.innerText = avg;
}

// Pagination
prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    loadFeedback();
  }
};

nextBtn.onclick = () => {
  if (page * PAGE_SIZE < totalCount) {
    page++;
    loadFeedback();
  }
};

// Initial load
loadFeedback();
