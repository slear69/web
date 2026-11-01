(function()
{
    const TILE =40, COLS= 20,ROWS=12;
    const TICKS_PER_SEC = 60 , DT = 1/TICKS_PER_SEC;
    const HALF = 12;
    const MAX_SPEED = 190,ACCEL = 1500,FRICTION = 1800;
    const UP = 1 , DOWN=2,LEFT=4,RIGHT=8;
    let player, tick, recording, ghosts, round;
    const LEVELS =[
        {
            name:"guards patrol the yard",
            seconds: 40,
            reward: 10,
            hints:["Guards walk the same route every edition. Touch one and the edition is reprinted. Watch the dotted routes, time your crossing and reach the exit."],
            enemies:[
                { from:[6,1],   to:[6,10], speed:110 },
                { from:[12,10], to:[12,1], speed:140, offset:0.3 },
            ],
             map:[
            "####################",
            "#@.................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#................*.#",
            "####################",
        ]},
        {
        name:"guard stands between you and the plate",
        seconds: 45,
        reward: 15,
        hints:["Same gate trick, but a guard walks the room. Reach plate a when the guard is away, then press Enter.",
                "Your clone holds the plate. Mind the guard, then take the gate."],
        enemies:[ { from:[1,6], to:[9,6], speed:100 } ],
        map:[
            "####################",
            "#.........#........#",
            "#.@.......#........#",
            "#.........#........#",
            "#.........#........#",
            "#.........A......*.#",
            "#.........#........#",
            "#.........#........#",
            "#.........#........#",
            "#..a......#........#",
            "#.........#........#",
            "####################",
        ]},
        {
            name:"the gunner cannot tell you from your clone",
            seconds: 50,
            reward: 15,
            hints:["A gunner locks on to the nearest thing it can see in range, and its shots always hit. Staying in its sight for a moment is fatal, so send a clone ahead. Step just inside the red circle, then press Enter.",
                   "Your clone stands in the gunner's sight and draws its fire. Slip around the edge of the room to the exit."],
            shooters:[
                { at:[18,5], range:10, every:75 },
            ],
            map:[
            "####################",
            "#@.................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#................*.#",
            "####################",
        ]},
        {
            name:"two get one worker try to past",
            seconds: 60,
            reward: 25,
            hints:["Plate a opens gate A. Plate b is behind gate A and opens gate B. You will need two clones. First step on plate a, then press Enter."],
            enemies:[{from:[14,1],to:[14,10] , speed : 120}],
            map:[
                "####################",
                "#@...#.....#.......#",
                "#....#.....#.......#",
                "#....#.....#.......#",
                "#....#.....#.......#",
                "#....A.....B.......#",
                "#....#.....#.......#",
                "#....#.....#.......#",
                "#....#.....#.......#",
                "#.a..#....b#.......#",
                "#....#.....#.....*.#",
                "####################",
            ]
        },
        {
            name:"a clone holds the gate, another takes the fire",
            seconds:25,
            reward:20,
            hints:["Step on plate a, then press Enter. That clone will hold the gate open."],
            shooters : [{at:[18,2],range:10,every:50}],
            map:[
                "####################",
                "#@.......#.........#",
                "#........#.........#",
                "#........#.........#",
                "#........#.........#",
                "#........A.........#",
                "#........#.........#",
                "#........#.........#",
                "#........#.........#",
                "#..a.....#.........#",
                "#........#.......*.#",
                "####################",
            ]
        },
        {
            name:"all defenders together",
            seconds:30,
            reward:25,
            hints:["use your clones all the ways you learned to use"],
            shooters : [{at:[18,5],range:5,every:60}],
            enemies:[{from:[15,7],to:[1,7] , speed : 120}],
            map:[
                "####################",
                "#@.................#",
                "#..................#",
                "#..................#",
                "#..................#",
                "#..................#",
                "#.................a#",
                "#A##################",
                "#..................#",
                "#..................#",
                "#.........*........#",
                "####################",
            ]
        }
    ]
    let def , tiles , SPAWN, plates, doors , exit , ROUND_TICKS , MAX_ROUNDS , levelIndex=0;
    let open = {}, pressed = {}, clearedTicks = 0;
    let enemies = [], money=0,lastReward=0,shopOpen=false,hitsLeft=0,invuln=0,flash=0;
    const SHOP_EVERY = 1;
    const ER = 11;
    let shooters = [];
    const ITEMS=[
        {id:"speed",  name:"Running Shoes", desc:"+15% walking speed",cost:40, max:3},
        {id:"time",   name:"Pocket Watch",  desc:"+5 seconds in every round",cost:55, max:4},
        {id:"clones", name:"Energy Drink",  desc:"+1 clone per level", cost:60, max:4},
        {id:"shield", name:"Iron Hat",desc:"lets you survive 1 touch from a guard",cost:75, max:2}
    ]
    const owned = {speed:0,time:0,clones:0,shield:0};
    const speedMul = () => 1+0.15*owned.speed;

    const isDoor = (ch) => ch >= "A"  && ch <= "Z";
    const isPlate = (ch)=> ch >= "a"  && ch <= "z";
    

    function solid(c,r)
    {
        if(c<0 || r <0 || c>= COLS || r >= ROWS) return true;
        const ch = tiles[r][c];
        if(shooters.some(s => s.at[0] === c && s.at[1] === r)) return true ;
        if (ch ==="#") return true;
        return isDoor(ch) && !open[ch.toLowerCase()];
    }

    function makeEntity()
    {
        return { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, fx: 1, fy: 0 };
    }
    function approach(v,target,amount)
    {
        if(v<target)
        {
            return Math.min(v+amount,target);
        }
        return Math.max(v - amount, target);
    }
    function step(e,bits)
    {
        let ix = ((bits & RIGHT) ? 1:0) - ((bits& LEFT)? 1 : 0)
        let iy = ((bits & DOWN) ? 1 : 0) - ((bits & UP) ? 1 : 0);
        if (ix && iy)
        {
            ix *= Math.SQRT1_2; iy *= Math.SQRT1_2;   // no fast going diagonals
        } 
        if(ix || iy)
        {
            e.fx =ix ; e.fy = iy;
        }

        e.vx = approach(e.vx, ix * MAX_SPEED* speedMul(),(ix ? ACCEL:FRICTION)*DT)
        e.vy = approach(e.vy, iy * MAX_SPEED* speedMul(),(iy ? ACCEL:FRICTION)*DT);
        
        // slide along walls bug 
        e.x += e.vx * DT;
        collide(e,true);
        e.y +=e.vy *DT;
        collide(e,false);
    }
    function collide(e, horizontal) 
    {
        const c0 = Math.floor((e.x - HALF) / TILE), c1 = Math.floor((e.x + HALF - 0.001) / TILE);
        const r0 = Math.floor((e.y - HALF) / TILE), r1 = Math.floor((e.y + HALF - 0.001) / TILE);
        for (let r =r0 ;r<= r1;r++)
        {
            for(let c =c0 ; c<=c1;c++)
            {
                if(!solid(c,r))continue;
                if (horizontal) {
                    if (e.vx > 0) e.x = c * TILE - HALF;
                    else if (e.vx < 0) e.x = (c + 1) * TILE + HALF;
                    e.vx = 0;
                    }
                    else 
                    {
                        if (e.vy > 0) e.y = r * TILE - HALF;
                        else if (e.vy < 0) e.y = (r + 1) * TILE + HALF;
                        e.vy = 0;
                    }
                return;
            }
        }
    }
    const keyMap={
    ArrowUp: UP, KeyW: UP, ArrowDown: DOWN, KeyS: DOWN,
    ArrowLeft: LEFT, KeyA: LEFT, ArrowRight: RIGHT, KeyD: RIGHT,
    }
    let keyBits = 0, touchBits = 0;

    addEventListener("keydown", (ev) => {
    if (ev.code in keyMap) { keyBits |= keyMap[ev.code]; ev.preventDefault(); }
    else if (ev.code === "Enter" && !ev.repeat) { endRound(); ev.preventDefault(); }
    else if (ev.code === "Backspace") { if (!shopOpen)resetLevel(); ev.preventDefault(); }
    });
    addEventListener("keyup",(ev) =>{if(ev.code in keyMap) keyBits &=~keyMap[ev.code]; });

    addEventListener("blur",() =>{keyBits=0;touchBits=0;})
    const padMap = { up: UP, down: DOWN, left: LEFT, right: RIGHT };
    document.querySelectorAll(".pad button").forEach((b) => {
        const bit = padMap[b.dataset.k];
        const on = (ev) => { ev.preventDefault(); touchBits |= bit; b.classList.add("on"); b.setPointerCapture(ev.pointerId); };
        const off = () => { touchBits &= ~bit; b.classList.remove("on"); };
        b.addEventListener("pointerdown", on);
        b.addEventListener("pointerup", off);
        b.addEventListener("pointercancel", off);
        b.addEventListener("lostpointercapture", off);
    });
    document.getElementById("endBtn").addEventListener("click",endRound);
    document.getElementById("resetBtn").addEventListener("click",()=>{if(!shopOpen) resetLevel();});

    
    function resetLevel()
    {
        clearedTicks = 0;
        ghosts=[] ; round=1 ; startRound()
    }
    const elName = document.getElementById("levelName");
    const elHint = document.getElementById("hint");
    const elLevelNo = document.getElementById("levelNo");
    function loadLevel(i)
    {
        levelIndex = i ; 
        def = LEVELS[i];
        if (def.map.length !== ROWS) throw new Error("Level " + (i+1) + ": needs " + ROWS + " rows");
        tiles = def.map; plates = [] ; doors = []; exit = null ; SPAWN = null ;
        for(let r = 0; r < ROWS; r++)
        {
            if(tiles[r].length !== COLS) throw new Error("Level " + (i+1) + " row " + (r+1) + ": needs " + COLS + " characters");
            for(let c=0; c < COLS ; c++)
            {
                const ch = tiles[r][c];
                if(ch === "@") SPAWN = { x: (c + .5) * TILE, y: (r + .5) * TILE };
                else if (ch === "*") exit = { c, r };
                else if (isPlate(ch)) plates.push({c,r,k:ch});
                else if (isDoor(ch)) doors.push({c, r, k: ch.toLowerCase()})
            }
        }
        if (!SPAWN) throw new Error("Level " + (i+1) + ": no @ start tile");
        ROUND_TICKS = (def.seconds + 5 * owned.time)* TICKS_PER_SEC;;
        MAX_ROUNDS = (def.maxRounds || 5)+owned.clones;
        enemies= def.enemies||[];
        shooters = def.shooters||[];
        elLevelNo.textContent = "Level " + (i+1) + " of " + LEVELS.length;
        paintStatic();
        resetLevel();
    }
    
    function nextLevel(){loadLevel((levelIndex + 1) % LEVELS.length); }

    function enemyPos(en,t)
    {
        const x0 = (en.from[0] + .5) * TILE, y0 = (en.from[1] + .5) * TILE;
        const x1 = (en.to[0] + .5) * TILE,   y1 = (en.to[1] + .5) * TILE;
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const ph = (en.speed * t * DT + (en.offset || 0) * len) % (2 * len);
        const d = ph<= len ? ph : 2 * len - ph;
        return { x: x0 + (x1 - x0) * d / len, y: y0 + (y1 - y0) * d / len };
    }
    function touchingEnemy()
    {
        for(const en of enemies)
        {
            const p = enemyPos(en,tick);
            if(Math.abs(p.x - player.x)<HALF + ER && Math.abs(p.y- player.y)<HALF+ER) return true;
        }
        return false
    }
    function caught(msg){
        flash = 25 ;
        startRound()
        elHint.textContent = msg || "Caught by a guard! The edition is reprinted. Watch the dotted route and try again.";
    }
    // -------------------------------------------------gunners
    let shotPlayer = false;
    function bulletBlocked(c,r)
    {
        if(c<0||r<0||c>=COLS || r >= ROWS) return true;
        const ch = tiles[r][c];
        return ch === "#" || (isDoor(ch) && !open[ch.toLowerCase()]);
    }
    function canSee(sx, sy, tx, ty)
    {
        const dx = tx - sx, dy = ty - sy, steps = Math.ceil(Math.hypot(dx, dy) / 8);
        for (let i = 1; i < steps; i++) {
            if (bulletBlocked(Math.floor((sx + dx * i / steps) / TILE), Math.floor((sy + dy * i / steps) / TILE))) return false;
        }
        return true;
    }
    function updateShooters()
    {
        shotPlayer = false;
        const targets = [player].concat(ghosts.map(g => g.e));
        for (const s of shooters)
        {
            const sx = (s.at[0] + .5) * TILE, sy = (s.at[1] + .5) * TILE;
            const range = (s.range || 8) * TILE, every = s.every || 60;
            if (s.flash > 0) s.flash--;
            let best = null, bestD = Infinity;
            for (const t of targets) {
                const d = Math.hypot(t.x - sx, t.y - sy);
                if (d <= range && d < bestD && canSee(sx, sy, t.x, t.y)) { best = t; bestD = d; }
            }
            if (!best) { s.target = null; s.lock = 0; continue; }
            if (best !== s.target) { s.target = best; s.lock = 0; }
            s.lock++;
            if (s.lock >= every) {
                s.lock = 0; s.flash = 10; s.shotX = best.x; s.shotY = best.y;
                if (best === player) shotPlayer = true;
            }
        }
    }
    function drawShooters()
    {
        ctx.save();
        for (const s of shooters)
        {
            const x = (s.at[0] + .5) * TILE, y = (s.at[1] + .5) * TILE, range = (s.range || 8) * TILE;
            ctx.globalAlpha = .06; ctx.fillStyle = C.player;
            ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = .3; ctx.strokeStyle = C.player; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
            ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1;
            let ux = 1, uy = 0;
            if (s.target) {
                const dx = s.target.x - x, dy = s.target.y - y, len = Math.hypot(dx, dy) || 1;
                ux = dx / len; uy = dy / len;
                const k = Math.min(1, s.lock / (s.every || 60));
                ctx.globalAlpha = .2 + .6 * k; ctx.strokeStyle = C.player; ctx.lineWidth = 1 + 2 * k; ctx.setLineDash([4, 5]);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(s.target.x, s.target.y); ctx.stroke();
                ctx.setLineDash([]); ctx.globalAlpha = 1;
            }
            ctx.fillStyle = C.ink; ctx.fillRect(x - 15, y - 15, 30, 30);
            ctx.strokeStyle = C.ink; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * 22, y + uy * 22); ctx.stroke();
            ctx.fillStyle = C.player; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    function drawShots()
    {   
    ctx.save();
        for (const s of shooters) {
            if (!(s.flash > 0)) continue;
            const x = (s.at[0] + .5) * TILE, y = (s.at[1] + .5) * TILE, k = s.flash / 10;
            ctx.globalAlpha = k; ctx.strokeStyle = C.player; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(s.shotX, s.shotY); ctx.stroke();
            ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(s.shotX, s.shotY, 14 * (1.2 - k), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    //--------------------------------------------------
    const elShop = document.getElementById("shop");
    const elShopList = document.getElementById("shopList");
    const elShopMoney = document.getElementById("shopMoney");
    const elMoney = document.getElementById("money");
    const price = (it) => it.cost * (1 + owned[it.id]);
    function afterLevel()
    {
        if ((levelIndex + 1) % SHOP_EVERY === 0) openShop(); else nextLevel();
    }
    function openShop() {shopOpen=true;elShop.hidden = false; renderShop();}
    function renderShop() {
        elShopMoney.textContent="$" + money
        elShopList.innerHTML = "";
        ITEMS.forEach((it) => {
            const maxed = owned[it.id] >= it.max, cost = price(it);
            const li = document.createElement("li");
            const text = document.createElement("div"); text.className = "item-text";
            const name = document.createElement("b");   name.textContent = it.name;
            const desc = document.createElement("span"); desc.textContent = it.desc + "  (" + owned[it.id] + "/" + it.max + ")";
            text.append(name, desc);
            const btn = document.createElement("button"); btn.className = "btn";
            btn.textContent = maxed ? "Sold out" : "Buy $" + cost;
            btn.disabled = maxed || money < cost;
            btn.addEventListener("click", () => { money -= cost; owned[it.id]++; renderShop(); });
            li.append(text, btn);
            elShopList.appendChild(li);
        });
    }
    document.getElementById("shopDone").addEventListener("click",()=>{
        shopOpen = false ; elShop.hidden = true; nextLevel();
    })
    function updateDoors(list)
    {
        open={} ; pressed = {};
        for(const p of plates)
            if (list.some(e => Math.floor(e.x / TILE) === p.c && Math.floor(e.y / TILE) === p.r))
                pressed[p.k] = open[p.k] = true;
        for(const d of doors)
        {
            if(open[d.k]) continue;
            const cx = (d.c + .5) * TILE, cy = (d.r + .5) * TILE;
            if (list.some(e => Math.abs(e.x - cx) < HALF + TILE/2 && Math.abs(e.y - cy) < HALF + TILE/2)) open[d.k] = true;
        }
    }
    function startRound()
    {
        elName.textContent = def.name;
        elHint.textContent = def.hints[Math.min(round - 1, def.hints.length - 1)];
        player=makeEntity();
        tick = 0;
        hitsLeft = owned.shield; invuln = 0;
        recording =[];
        shooters.forEach(s => { s.target = null; s.lock = 0; s.flash = 0; });
        ghosts.forEach((g) => { g.e = makeEntity(); });
    }
    function endRound()
    {
        if (shopOpen||clearedTicks > 0 || tick < 5) return;
        if(round >=MAX_ROUNDS){resetLevel();return;}
        ghosts.push({ run: recording, e: null });
        round++;
        startRound();
    }
    function update()
    {
        if(shopOpen)return;
        if(clearedTicks>0){if (--clearedTicks === 0) afterLevel(); return; }
        const bits = keyBits | touchBits;
        recording.push(bits);
        updateDoors([player].concat(ghosts.map(g=>g.e)));
        step(player , bits);
        for(const g of ghosts) step(g.e,g.run[tick] || 0);
        tick ++;
        if(invuln>0) invuln--;
        if(flash >0) flash--;
        updateShooters();
        if(invuln === 0 && (touchingEnemy() || shotPlayer))
        {
            if (hitsLeft > 0) { hitsLeft--; invuln = 90; }
            else { caught(shotPlayer ? "A gunner shot you! Send a clone ahead to draw its fire, then slip past." : undefined); return; }
        }
            if (exit && Math.floor(player.x / TILE) === exit.c && Math.floor(player.y / TILE) === exit.r) {
            lastReward = (def.reward || 10) + Math.max(0, 5 - round) * 3;
            money += lastReward;
            clearedTicks = 150;
            return;
        }
        if (tick >= ROUND_TICKS) endRound();
    }
    const cv = document.getElementById("c")
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = COLS * TILE *dpr ; cv.height = ROWS   * TILE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(document.documentElement);
    const col = (n) => css.getPropertyValue(n).trim();
    const C = { floor: col("--floor"), grid: col("--grid"), wall: col("--wall"), hatch: col("--wall-hatch"), paper: col("--paper"), ink: col("--ink"), player: col("--red"), ghost: col("--blue") };
    const LABEL_FONT = "italic 700 12px 'Old Standard TT', Georgia, serif";
    function drawEntity(e,color,alpha,label)
    {
        ctx.fillStyle = C.ink;// offset "misprint" shadow
        ctx.globalAlpha = alpha * 0.25;
        ctx.fillRect(e.x - HALF + 3, e.y - HALF + 3, HALF * 2, HALF * 2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle=color
        ctx.fillRect(e.x - HALF, e.y - HALF, HALF * 2, HALF * 2);
        ctx.strokeStyle=C.ink ; ctx.lineWidth = 1.5;
        ctx.strokeRect(e.x - HALF,e.y -HALF , HALF*2,HALF*2)
        const len = Math.hypot(e.fx, e.fy) || 1;
        ctx.fillStyle =C.paper;
        ctx.fillRect(e.x + (e.fx / len)* 7 - 3, e.y +(e.fy / len) * 7 - 3, 6, 6);
        ctx.globalAlpha = 1;
        if(label)
        {
            ctx.fillStyle=C.ink;ctx.font = LABEL_FONT;  ctx.textAlign = "center";
            ctx.globalAlpha=Math.min(1,alpha + .2);
            ctx.fillText(label,e.x,e.y-HALF-5);
            ctx.globalAlpha=1;
        }
    }
    const bg = document.createElement("canvas");
    bg.width = COLS * TILE * dpr ; bg.height = ROWS * TILE*dpr;
    function paintStatic() {
        const g = bg.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = C.floor; g.fillRect(0, 0, COLS * TILE, ROWS * TILE);
        g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
        for (let c = 1; c < COLS; c++) { g.moveTo(c * TILE + .5, 0); g.lineTo(c * TILE + .5, ROWS * TILE); }
        for (let r = 1; r < ROWS; r++) { g.moveTo(0, r * TILE + .5); g.lineTo(COLS * TILE, r * TILE + .5); }
        g.stroke();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            if (tiles[r][c] !== "#") continue;
            const x = c * TILE, y = r * TILE;
            g.fillStyle = C.wall; g.fillRect(x, y, TILE, TILE);
            // engraver's cross-hatching
            g.save(); g.beginPath(); g.rect(x, y, TILE, TILE); g.clip();
            g.strokeStyle = C.hatch; g.lineWidth = 1; g.beginPath();
            for (let k = -TILE; k < TILE * 2; k += 6)
            {
                g.moveTo(x + k, y + TILE); g.lineTo(x + k + TILE, y); 
            }
            g.stroke(); g.restore();
        }
    }
    function drawExit() {
        if (!exit) return;
        const x = exit.c * TILE , y = exit.r * TILE
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 3, y + 3, TILE - 6, TILE - 6); ctx.clip();
        ctx.strokeStyle = C.ink ; ctx.lineWidth = 2 ; ctx.beginPath();
        for (let k = -TILE; k < TILE * 2; k += 8) { ctx.moveTo(x + k, y + TILE); ctx.lineTo(x + k + TILE, y); }
        ctx.stroke(); ctx.restore();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
    }
    function drawPlatesAndDoors() {
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "700 14px 'Courier Prime', 'Courier New', monospace";
        for (const p of plates) {
            const x = p.c * TILE, y = p.r * TILE, on = !!pressed[p.k];
            ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
            ctx.strokeRect(x + 7, y + 7, TILE - 14, TILE - 14);
            if (on) { ctx.fillStyle = C.ink; ctx.fillRect(x + 7, y + 7, TILE - 14, TILE - 14); }
            ctx.fillStyle = on ? C.paper : C.ink;
            ctx.fillText(p.k, x + TILE / 2, y + TILE / 2 + 1);
        }
        for (const d of doors) {
            const x = d.c * TILE, y = d.r * TILE;
            if (open[d.k]) {
                ctx.save(); ctx.globalAlpha = .55; ctx.setLineDash([4, 4]);
                ctx.strokeStyle = C.player; ctx.lineWidth = 2;
                ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                ctx.restore();
                ctx.fillStyle = C.player; ctx.globalAlpha = .6;
                ctx.fillText(d.k.toUpperCase(), x + TILE / 2, y + TILE / 2 + 1);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = C.player; ctx.fillRect(x, y, TILE, TILE);
                ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
                ctx.fillStyle = C.paper;
                ctx.fillText(d.k.toUpperCase(), x + TILE / 2, y + TILE / 2 + 1);
            }
        }
        ctx.restore();
    }
    function drawEnemies() {  
        ctx.save();
        for (const en of enemies) {
            ctx.globalAlpha = .25; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.moveTo((en.from[0] + .5) * TILE, (en.from[1] + .5) * TILE);
            ctx.lineTo((en.to[0] + .5) * TILE,(en.to[1] + .5)* TILE);
            ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1;   
            const p = enemyPos(en, tick);
            ctx.fillStyle = C.ink;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - 13);ctx.lineTo(p.x + 13, p.y); ctx.lineTo(p.x, p.y + 13);ctx.lineTo(p.x - 13, p.y);
            ctx.closePath();ctx.fill();
            ctx.fillStyle = C.paper;
            ctx.fillRect(p.x - 6 , p.y - 3,4,4);ctx.fillRect(p.x + 2 , p.y - 3,4,4);
        }
        ctx.restore();
    }


    function drawBanner() {
        const W = COLS * TILE, isLast = levelIndex === LEVELS.length - 1;
        ctx.save(); 
        ctx.globalAlpha = .92; ctx.fillStyle = C.paper; ctx.fillRect(0, 170, W, 140);
        ctx.globalAlpha = 1; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        ctx.strokeRect(0, 170, W, 140);
        ctx.fillStyle = C.ink; ctx.textAlign = "center";        
        ctx.font = "700 44px 'UnifrakturCook', Georgia, serif";
        ctx.fillText(isLast ? "All Editions Printed" : "Extra! Level Cleared", W / 2, 238);
        ctx.font = "italic 700 16px 'Old Standard TT', Georgia, serif";
        ctx.fillText("Clones employed: " + ghosts.length + "     Earned $" + lastReward, W / 2, 278);
        ctx.restore();
    }
    function draw()
    {
        ctx.drawImage(bg,0, 0, COLS * TILE, ROWS * TILE);
        ctx.strokeStyle = C.ink; ctx.globalAlpha = .55; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.strokeRect(SPAWN.x - HALF - 4, SPAWN.y - HALF - 4, HALF * 2 + 8, HALF * 2 + 8);
        ctx.setLineDash([]);ctx.globalAlpha = 1;

        drawExit();
        drawPlatesAndDoors();
        drawEnemies();
        drawShooters();
        ghosts.forEach((g, i) => drawEntity(g.e, C.ghost, 0.6, "No. " + (i + 1)));
        drawEntity(player, C.player, (invuln > 0 && ((invuln >> 3) & 1))? 0.35 : 1, "You");
        drawShots();
        if (clearedTicks > 0) drawBanner();
        if (flash > 0){ ctx.fillStyle = C.player; ctx.globalAlpha = flash / 60; ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE); ctx.globalAlpha = 1; }
        
    }
    const elTime = document.getElementById("time")
    const elRound = document.getElementById("round")
    const elGhosts = document.getElementById("ghosts")
    const elBar = document.getElementById("bar")
    function hud()
    {
        elTime.textContent = Math.max(0, (ROUND_TICKS - tick) / TICKS_PER_SEC).toFixed(1);
        elRound.textContent = round + " / " + MAX_ROUNDS;
        elGhosts.textContent = ghosts.length;
        elBar.style.transform = "scaleX(" + (1 - tick / ROUND_TICKS) + ")";
        elMoney.textContent = "$" + money;
    }
    let last = performance.now(), acc = 0;
    function frame(now) {
        acc += Math.min(now - last, 250) / 1000; last = now;
        while (acc >= DT) { update(); acc -= DT; }
        draw(); hud();
        requestAnimationFrame(frame);
    }

    loadLevel(Math.max(0, Math.min(LEVELS.length - 1, (parseInt(location.hash.slice(1), 10) || 1) - 1)));
    requestAnimationFrame(frame);

})();