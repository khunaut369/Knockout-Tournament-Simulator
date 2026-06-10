// ui.js
const UI = {
    renderLegConfig: function(thirdPlaceChecked) {
        const legsList = document.getElementById("legsList");
        const legConfigCheck = document.getElementById("legConfigCheck");
        if (!legConfigCheck.checked) return;

        legsList.innerHTML = "";
        const rounds = TournamentLogic.getRounds(AppState.teams.length, thirdPlaceChecked);

        if (rounds.length === 0) {
            legsList.innerHTML = "<span class='text-muted'>ข้อมูลทีมไม่เพียงพอสำหรับจัดสาย</span>";
            return;
        }

        rounds.forEach(round => {
            const div = document.createElement("div");
            div.className = "leg-item";
            const label = document.createElement("span");
            label.textContent = round;

            const select = document.createElement("select");
            select.innerHTML = `<option value="1">1 นัด</option><option value="2">2 นัด</option>`;
            select.value = AppState.legSelections[round] || "1";

            select.addEventListener("change", (e) => {
                AppState.legSelections[round] = e.target.value;
                Engine.resetBracket(); 
            });

            div.appendChild(label);
            div.appendChild(select);
            legsList.appendChild(div);
        });
    },

    renderTeamEditor: function() {
        const tab2Container = document.getElementById("teamListContainer");
        tab2Container.innerHTML = "";
        
        if (AppState.teams.length === 0) {
            tab2Container.innerHTML = "<p class='text-muted'>กรุณากรอกข้อมูลทีมในแท็บ 'ข้อมูลพื้นฐาน' ก่อน</p>";
            return;
        }

        AppState.teams.forEach((team, index) => {
            const div = document.createElement("div");
            div.className = "team-item";
            
            const currentOvr = Engine.getTeamCurrentOvr(team.id);
            const isModded = AppState.autoOvrEnabled && currentOvr !== (parseInt(team.ovr) || 80);
            
            const info = document.createElement("span");
            let infoHtml = `${team.id} - ${team.name} (คู่ที่ ${team.match})`;
            if (isModded) {
                infoHtml += ` <span style="color: #2563eb; font-weight: bold; margin-left: 10px;">(OVR ปัจจุบัน: ${currentOvr})</span>`;
            }
            info.innerHTML = infoHtml;

            const input = document.createElement("input");
            input.type = "number";
            input.value = team.ovr;
            input.dataset.index = index; 
            input.title = "ค่าพลังพื้นฐาน (Base OVR)";

            div.appendChild(info);
            div.appendChild(input);
            tab2Container.appendChild(div);
        });
    },

    renderTab3: function(thirdPlaceChecked) {
        const fifaDayConfigContainer = document.getElementById("fifaDayConfigContainer");
        const fixturesContainer = document.getElementById("fixturesContainer");

        if (AppState.teams.length < 2) {
            fifaDayConfigContainer.innerHTML = "<p class='text-muted'>ข้อมูลทีมไม่เพียงพอ</p>";
            fixturesContainer.innerHTML = "";
            return;
        }

        fifaDayConfigContainer.innerHTML = "";
        const rounds = TournamentLogic.getForwardRounds(AppState.teams.length, thirdPlaceChecked);
        
        rounds.forEach(round => {
            const isTwoLegs = AppState.legSelections[round] === "2";
            const row = document.createElement("div");
            row.className = "fd-row";
            
            let html = `<span>${round}</span>`;
            html += `<input type="number" class="fd-input" data-round="${round}" data-leg="1" placeholder="นัด 1" value="${AppState.fifaDays[`${round}_1`] || ''}">`;
            
            if (isTwoLegs) {
                html += `<input type="number" class="fd-input" data-round="${round}" data-leg="2" placeholder="นัด 2" value="${AppState.fifaDays[`${round}_2`] || ''}" readonly style="background:#f1f5f9;">`;
            }
            
            row.innerHTML = html;
            fifaDayConfigContainer.appendChild(row);
        });

        document.querySelectorAll(".fd-input").forEach(input => {
            input.addEventListener("input", (e) => {
                const round = e.target.dataset.round;
                const val = e.target.value;
                AppState.fifaDays[`${round}_1`] = val;

                if (AppState.legSelections[round] === "2") {
                    const leg2Input = document.querySelector(`.fd-input[data-round="${round}"][data-leg="2"]`);
                    const nextDay = val !== "" ? parseInt(val) + 1 : "";
                    leg2Input.value = nextDay;
                    AppState.fifaDays[`${round}_2`] = nextDay;
                }
                UI.renderFixtures(thirdPlaceChecked); 
            });
        });

        UI.renderFixtures(thirdPlaceChecked);
    },

    renderFixtures: function(thirdPlaceChecked) {
        const fixturesContainer = document.getElementById("fixturesContainer");
        fixturesContainer.innerHTML = "";
        const coefficient = document.getElementById("coefficientInput").value || "0";

        for (const [round, matches] of Object.entries(AppState.matchState)) {
            const roundDiv = document.createElement("div");
            roundDiv.className = "round-container";
            
            let fdText = AppState.fifaDays[`${round}_1`] || "?";
            if (matches.length > 0 && matches[0].isTwoLegs) {
                fdText += ` และ ${AppState.fifaDays[`${round}_2`] || "?"}`;
            }
            roundDiv.innerHTML = `<div class="round-title">${round} - ฟีฟ่าเดย์ที่ ${fdText}</div>`;

            matches.forEach((m, index) => {
                const matchCard = document.createElement("div");
                matchCard.className = "match-card";

                // [แก้ไขจุดนี้] ปรับปรุงรูปแบบสกอร์ที่มีจุดโทษให้ตรงตามรูปแบบ "1(7) - (6)1" ตามต้องการ
                const formatScore = (leg) => {
                    if (leg.h === null) return "สุ่มผล (SIM)";
                    if (leg.hp !== null) return `${leg.h}(${leg.hp}) - (${leg.ap})${leg.a}`;
                    return `${leg.h} - ${leg.a}`;
                };

                const getExport = (legData, fd, isTwoLegs) => {
                    if (legData.h === null) return "รอผลการแข่งขัน...";
                    const code = TournamentLogic.getResultCode(legData.h, legData.a, legData.hp, legData.ap, isTwoLegs);
                    return `${fd || '?'},${m.home.id},${code},${m.away.id},${coefficient},k`;
                };

                let html = `
                    <div class="match-header">
                        <div class="match-header-layout">
                            <div><span>คู่ที่ ${m.matchId}</span></div>
                            <div class="center">
                                <button class="btn-swap" data-round="${round}" data-index="${index}">สลับเหย้าเยือน 🔄</button>
                            </div>
                            <div class="right">
                                <button class="btn-clear-match" data-round="${round}" data-index="${index}">ล้างผล 🗑️</button>
                            </div>
                        </div>
                    </div>
                `;

                if (!m.isTwoLegs) {
                    html += `
                        <div class="match-row">
                            <span class="team-name home">${m.home.name}</span>
                            <button class="btn-random" data-round="${round}" data-index="${index}" data-leg="1">${formatScore(m.leg1)}</button>
                            <span class="team-name away">${m.away.name}</span>
                        </div>
                        <div class="export-box">${getExport(m.leg1, AppState.fifaDays[`${round}_1`], false)}</div>
                    `;
                } else {
                    html += `
                        <div class="leg-title">นัดที่ 1</div>
                        <div class="match-row">
                            <span class="team-name home">${m.home.name}</span>
                            <button class="btn-random" data-round="${round}" data-index="${index}" data-leg="1">${m.leg1.h === null ? 'สุ่มผล (SIM)' : m.leg1.h + ' - ' + m.leg1.a}</button>
                            <span class="team-name away">${m.away.name}</span>
                        </div>
                        <div class="export-box">${getExport(m.leg1, AppState.fifaDays[`${round}_1`], true)}</div>
                    `;

                    html += `
                        <div class="leg-title">นัดที่ 2</div>
                        <div class="match-row">
                            <span class="team-name home">${m.away.name}</span>
                            <button class="btn-random" data-round="${round}" data-index="${index}" data-leg="2">${m.leg2.h === null ? 'สุ่มผล (SIM)' : m.leg2.h + ' - ' + m.leg2.a}</button>
                            <span class="team-name away">${m.home.name}</span>
                        </div>
                        <div class="export-box">
                            ${m.leg2.h === null ? 'รอผลการแข่งขัน...' : `${AppState.fifaDays[`${round}_2`] || '?'},${m.away.id},${TournamentLogic.getResultCode(m.leg2.h, m.leg2.a, null, null, true)},${m.home.id},${coefficient},k`}
                        </div>
                    `;

                    if (m.leg1.h !== null && m.leg2.h !== null) {
                        const aggH = m.leg1.h + m.leg2.a;
                        const aggA = m.leg1.a + m.leg2.h;
                        let aggStr = `สกอร์รวม: ${m.home.name} ${aggH} - ${aggA} ${m.away.name}`;
                        
                        // ตรวจเช็คความสมมาตรของสกอร์รวมในกรณีดวลจุดโทษนัดที่สอง (ให้เป็นแบบ "1(7) - (6)1" ด้วยเช่นกัน)
                        if (aggH === aggA && m.leg2.hp !== null) {
                            aggStr = `สกอร์รวม: ${m.home.name} ${aggH}(${m.leg2.ap}) - (${m.leg2.hp})${aggA} ${m.away.name}`;
                        }
                        html += `<div class="aggregate-row">${aggStr}</div>`;
                    }
                }

                matchCard.innerHTML = html;
                roundDiv.appendChild(matchCard);
            });

            fixturesContainer.appendChild(roundDiv);
        }

        if (typeof App !== 'undefined' && App.bindMatchEvents) App.bindMatchEvents();
    },

    getBracketScoreHTML: function(match, isHome) {
        const leg1 = match.leg1;
        const leg2 = match.leg2;
        
        if (leg1.h === null) return `<span class="text-muted">-</span>`;

        const s1 = isHome ? leg1.h : leg1.a;
        const p1 = isHome ? leg1.hp : leg1.ap;

        if (!match.isTwoLegs) {
            let html = `<span class="score-agg">${s1}</span>`;
            if (p1 !== null) html += `<span class="score-pen">(${p1})</span>`;
            return html;
        } else {
            if (leg2.h === null) {
                return `<span class="score-leg">${s1}</span> <span class="score-leg">-</span> <span class="text-muted">-</span>`;
            }
            const s2 = isHome ? leg2.a : leg2.h;
            const p2 = isHome ? leg2.ap : leg2.hp;
            const agg = s1 + s2;
            
            let html = `<span class="score-leg">${s1}</span> <span class="score-leg">${s2}</span> <span class="score-agg">${agg}</span>`;
            if (p2 !== null) html += `<span class="score-pen">(${p2})</span>`;
            return html;
        }
    },

    createBracketMatchDOM: function(match) {
        const matchDiv = document.createElement("div");
        matchDiv.className = "bracket-match";

        const outcome = Engine.getMatchOutcome(match);
        const isHomeWinner = outcome.winner && outcome.winner.id === match.home.id && !match.home.id.startsWith("W_");
        const isAwayWinner = outcome.winner && outcome.winner.id === match.away.id && !match.away.id.startsWith("W_");

        const homeDiv = document.createElement("div");
        homeDiv.className = `bracket-team ${isHomeWinner ? 'winner' : ''}`;
        homeDiv.innerHTML = `
            <span class="bracket-team-name">${match.home.name}</span>
            <div class="score-wrapper">${UI.getBracketScoreHTML(match, true)}</div>
        `;

        const awayDiv = document.createElement("div");
        awayDiv.className = `bracket-team ${isAwayWinner ? 'winner' : ''}`;
        awayDiv.innerHTML = `
            <span class="bracket-team-name">${match.away.name}</span>
            <div class="score-wrapper">${UI.getBracketScoreHTML(match, false)}</div>
        `;

        matchDiv.appendChild(homeDiv);
        matchDiv.appendChild(awayDiv);
        return matchDiv;
    },

    renderBracket: function(thirdPlaceChecked) {
        const container = document.getElementById("bracketContainer");
        
        if (Object.keys(AppState.matchState).length === 0) {
            container.innerHTML = "<p class='text-muted'>กรุณาสร้างสายการแข่งขันในแท็บ 3 ก่อน</p>";
            return;
        }

        container.innerHTML = "";
        
        const pairingSystem = document.querySelector('input[name="pairing"]:checked').value;
        const isDirect = pairingSystem === "direct";

        const mainWrapper = document.createElement("div");
        mainWrapper.className = "bracket-columns-wrapper";
        if (isDirect) {
            mainWrapper.classList.add("direct");
        }

        const rounds = TournamentLogic.getForwardRounds(AppState.teams.length, thirdPlaceChecked);
        
        const mainRounds = rounds.filter(r => r !== "รอบชิงอันดับที่ 3");
        const hasThirdPlace = rounds.includes("รอบชิงอันดับที่ 3");

        mainRounds.forEach((round, colIndex) => {
            const colDiv = document.createElement("div");
            colDiv.className = "bracket-column";
            
            const colHeader = document.createElement("div");
            colHeader.className = "bracket-header";
            colHeader.textContent = round;
            colDiv.appendChild(colHeader);

            const matches = AppState.matchState[round];
            
            const pairsWrapper = document.createElement("div");
            pairsWrapper.className = "bracket-pairs-wrapper";
            
            if (colIndex === mainRounds.length - 1) {
                pairsWrapper.classList.add("final-wrapper");
            }

            if (isDirect && colIndex < mainRounds.length - 1) {
                for (let i = 0; i < matches.length; i += 2) {
                    const pairDiv = document.createElement("div");
                    pairDiv.className = "bracket-pair";
                    pairDiv.appendChild(UI.createBracketMatchDOM(matches[i]));
                    
                    if (matches[i+1]) {
                        pairDiv.appendChild(UI.createBracketMatchDOM(matches[i+1]));
                    } else {
                        pairDiv.classList.add("single-match-pair");
                    }
                    pairsWrapper.appendChild(pairDiv);
                }
            } else {
                matches.forEach(m => {
                    const singleDiv = document.createElement("div");
                    singleDiv.className = "bracket-pair single-match-pair";
                    singleDiv.appendChild(UI.createBracketMatchDOM(m));
                    pairsWrapper.appendChild(singleDiv);
                });
            }
            
            colDiv.appendChild(pairsWrapper);
            mainWrapper.appendChild(colDiv);
        });

        container.appendChild(mainWrapper);

        if (hasThirdPlace && AppState.matchState["รอบชิงอันดับที่ 3"]) {
            const thirdPlaceMatch = AppState.matchState["รอบชิงอันดับที่ 3"][0];
            if (thirdPlaceMatch) {
                const thirdContainer = document.createElement("div");
                thirdContainer.className = "third-place-container";
                
                const thirdContent = document.createElement("div");
                thirdContent.className = "third-place-content";
                
                const thirdHeader = document.createElement("div");
                thirdHeader.className = "bracket-header third-place-header";
                thirdHeader.textContent = "รอบชิงอันดับที่ 3";
                
                thirdContent.appendChild(thirdHeader);
                thirdContent.appendChild(UI.createBracketMatchDOM(thirdPlaceMatch));
                thirdContainer.appendChild(thirdContent);
                
                container.appendChild(thirdContainer);
            }
        }
    },

    renderExportTab: function(thirdPlaceChecked) {
        const exportTextarea = document.getElementById("exportTextarea");
        const exportScoreTextarea = document.getElementById("exportScoreTextarea");
        const coefficient = document.getElementById("coefficientInput").value || "0";

        if (Object.keys(AppState.matchState).length === 0) {
            exportTextarea.value = "ยังไม่มีข้อมูลการแข่งขัน กรุณาสร้างและสุ่มผลการแข่งขันในแท็บที่ 3 ก่อน";
            if (exportScoreTextarea) exportScoreTextarea.value = "ยังไม่มีข้อมูลการแข่งขัน";
            return;
        }

        let exportLines = [];
        let exportScoreLines = []; 
        const rounds = TournamentLogic.getForwardRounds(AppState.teams.length, thirdPlaceChecked);

        rounds.forEach(round => {
            const matches = AppState.matchState[round];
            if (!matches) return;

            matches.forEach(m => {
                if (m.leg1.h !== null && !m.home.id.startsWith("W_") && !m.home.id.startsWith("L_") && !m.away.id.startsWith("W_") && !m.away.id.startsWith("L_")) {
                    const fd1 = AppState.fifaDays[`${round}_1`] || "?";
                    const r1 = TournamentLogic.getResultCode(m.leg1.h, m.leg1.a, m.leg1.hp, m.leg1.ap, m.isTwoLegs);
                    
                    exportLines.push(`${fd1},${m.home.id},${r1},${m.away.id},${coefficient},k`);
                    
                    const pen1_leg1 = m.leg1.hp !== null ? m.leg1.hp : 'x';
                    const pen2_leg1 = m.leg1.ap !== null ? m.leg1.ap : 'x';
                    
                    exportScoreLines.push(`${fd1},${m.home.id},${m.leg1.h},${m.leg1.a},${m.away.id},${pen1_leg1},${pen2_leg1}`);
                }

                if (m.isTwoLegs && m.leg2.h !== null && !m.home.id.startsWith("W_") && !m.home.id.startsWith("L_") && !m.away.id.startsWith("W_") && !m.away.id.startsWith("L_")) {
                    const fd2 = AppState.fifaDays[`${round}_2`] || "?";
                    const r2 = TournamentLogic.getResultCode(m.leg2.h, m.leg2.a, null, null, true);
                    
                    exportLines.push(`${fd2},${m.away.id},${r2},${m.home.id},${coefficient},k`);
                    
                    const pen1_leg2 = m.leg2.hp !== null ? m.leg2.hp : 'x';
                    const pen2_leg2 = m.leg2.ap !== null ? m.leg2.ap : 'x';
                    
                    exportScoreLines.push(`${fd2},${m.away.id},${m.leg2.h},${m.leg2.a},${m.home.id},${pen1_leg2},${pen2_leg2}`);
                }
            });
        });

        if (exportLines.length === 0) {
            exportTextarea.value = "ระบบยังไม่พบผลคะแนนที่ถูกสุ่ม กรุณากดสุ่มผลในแท็บที่ 3 ก่อน";
            if (exportScoreTextarea) exportScoreTextarea.value = "ระบบยังไม่พบผลคะแนนที่ถูกสุ่ม";
        } else {
            exportTextarea.value = exportLines.join("\n");
            if (exportScoreTextarea) exportScoreTextarea.value = exportScoreLines.join("\n");
        }
    }
};