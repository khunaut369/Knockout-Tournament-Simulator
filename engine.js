// engine.js
const Engine = {
	
	// เพิ่มไว้ในออบเจ็กต์ Engine (ไฟล์ engine.js)
    getTeamCurrentOvr: function(teamId) {
        const baseTeam = AppState.teams.find(t => t.id === teamId);
        if (!baseTeam) return 80; // คืนค่าเริ่มต้นสำหรับทีมที่ยังไม่เข้ารอบ (Placeholder)
        
        let ovr = parseInt(baseTeam.ovr) || 80;
        
        if (AppState.autoOvrEnabled) {
            let wins = 0, draws = 0, losses = 0;
            
            // ลูปเช็คทุกแมตช์ที่แข่งจบแล้วทั้งหมด
            Object.values(AppState.matchState).forEach(matches => {
                matches.forEach(match => {
                    const isHome = match.home.id === teamId;
                    const isAway = match.away.id === teamId;
                    if (!isHome && !isAway) return;

                    // คำนวณนัดที่ 1 (ในเวลา 90 นาที และจุดโทษนัดเดียว)
                    if (match.leg1.h !== null) {
                        let myScore = isHome ? match.leg1.h : match.leg1.a;
                        let opScore = isHome ? match.leg1.a : match.leg1.h;
                        let myPen = isHome ? match.leg1.hp : match.leg1.ap;
                        let opPen = isHome ? match.leg1.ap : match.leg1.hp;

                        if (myScore > opScore) wins++;
                        else if (myScore < opScore) losses++;
                        else {
                            if (myPen !== null && opPen !== null) {
                                if (myPen > opPen) wins++;
                                else if (myPen < opPen) losses++;
                                else draws++;
                            } else {
                                draws++;
                            }
                        }
                    }

                    // คำนวณนัดที่ 2 (เฉพาะผลใน 90 นาที ไม่รวมจุดโทษตัดสินเข้ารอบ)
                    if (match.isTwoLegs && match.leg2.h !== null) {
                        // นัดที่ 2 สลับทีมเหย้าเยือน คะแนนเจ้าบ้านจริงๆ คือ match.leg2.a
                        let myScore2 = isHome ? match.leg2.a : match.leg2.h;
                        let opScore2 = isHome ? match.leg2.h : match.leg2.a;

                        if (myScore2 > opScore2) wins++;
                        else if (myScore2 < opScore2) losses++;
                        else draws++;
                    }
                });
            });

            // คำนวณ OVR ใหม่ และลิมิตเพดานไว้ที่ 1 - 99
            ovr += (wins * AppState.ovrMod.win) + (draws * AppState.ovrMod.draw) + (losses * AppState.ovrMod.lose);
            ovr = Math.max(1, Math.min(99, ovr)); 
        }
        return ovr;
    },
	
    resetBracket: function() {
        AppState.matchState = {};
    },

    generateInitialBracket: function(thirdPlaceChecked, pairingSystem) {
        const rounds = TournamentLogic.getForwardRounds(AppState.teams.length, thirdPlaceChecked);
        AppState.matchState = {};
        AppState.fifaDays = {};

        let currentTeams = [...AppState.teams];
        
        rounds.forEach((round, roundIndex) => {
            const isTwoLegs = AppState.legSelections[round] === "2";
            AppState.matchState[round] = [];

            AppState.fifaDays[`${round}_1`] = ""; 
            if (isTwoLegs) AppState.fifaDays[`${round}_2`] = "";

            let matchCount = 0;
            if (round === "รอบชิงอันดับที่ 3") {
                matchCount = 1;
            } else if (roundIndex === 0) {
                matchCount = currentTeams.length / 2;
            } else {
                let prevRound = rounds[roundIndex-1];
                if (prevRound === "รอบชิงอันดับที่ 3") prevRound = rounds[roundIndex-2];
                matchCount = AppState.matchState[prevRound].length / 2;
            }

            for (let i = 0; i < matchCount; i++) {
                let homeTeam, awayTeam;

                if (roundIndex === 0 && currentTeams.length >= (i*2+2)) {
                    homeTeam = currentTeams[i*2];
                    awayTeam = currentTeams[i*2+1];
                } else if (round === "รอบชิงอันดับที่ 3") {
                    homeTeam = { id: `L_SF1`, name: `รอทีมแพ้รอบรองฯ...` };
                    awayTeam = { id: `L_SF2`, name: `รอทีมแพ้รอบรองฯ...` };
                } else {
                    if (pairingSystem === "random") {
                        homeTeam = { id: `W_RND_H`, name: `รอการจับคู่สุ่ม...` };
                        awayTeam = { id: `W_RND_A`, name: `รอการจับคู่สุ่ม...` };
                    } else {
                        homeTeam = { id: `W_${roundIndex}_${i}_H`, name: `รอผู้ชนะคู่ที่ ${i*2+1}` };
                        awayTeam = { id: `W_${roundIndex}_${i}_A`, name: `รอผู้ชนะคู่ที่ ${i*2+2}` };
                    }
                }

                AppState.matchState[round].push({
                    matchId: i + 1,
                    home: homeTeam,
                    away: awayTeam,
                    isTwoLegs: isTwoLegs,
                    leg1: { h: null, a: null, hp: null, ap: null },
                    leg2: { h: null, a: null, hp: null, ap: null }
                });
            }
        });
    },

    // [แก้บั๊กที่นี่] การคำนวณสกอร์รวมของ 2 นัด
    getMatchOutcome: function(match) {
        if (!match.isTwoLegs) {
            if (match.leg1.h === null) return { winner: null, loser: null };
            if (match.leg1.h > match.leg1.a) return { winner: match.home, loser: match.away };
            if (match.leg1.h < match.leg1.a) return { winner: match.away, loser: match.home };
            if (match.leg1.hp > match.leg1.ap) return { winner: match.home, loser: match.away };
            return { winner: match.away, loser: match.home };
        } else {
            if (match.leg1.h === null || match.leg2.h === null) return { winner: null, loser: null };
            
            // นัดที่ 2 ทีมเยือนดั้งเดิม(a) ได้สิทธิ์เป็นทีมเหย้า ดังนั้นคะแนนเหย้าของนัด 2 (leg2.h) คือของทีมเยือน
            const aggH = match.leg1.h + match.leg2.a; 
            const aggA = match.leg1.a + match.leg2.h; 
            
            if (aggH > aggA) return { winner: match.home, loser: match.away };
            if (aggH < aggA) return { winner: match.away, loser: match.home };
            
            // กรณีเสมอและดวลจุดโทษในนัด 2 (ap คือจุดโทษของทีม home ดั้งเดิม, hp คือของทีม away)
            if (match.leg2.ap > match.leg2.hp) return { winner: match.home, loser: match.away };
            return { winner: match.away, loser: match.home };
        }
    },

    clearDownstream: function(round, matchIndex, thirdPlaceChecked, pairingSystem) {
        const rounds = TournamentLogic.getForwardRounds(AppState.teams.length, thirdPlaceChecked);
        const currentRoundIdx = rounds.indexOf(round);

        if (round === "รอบชิงชนะเลิศ" || round === "รอบชิงอันดับที่ 3") return;

        if (pairingSystem === "direct") {
            if (round === "รอบรองชนะเลิศ") {
                if (AppState.matchState["รอบชิงชนะเลิศ"]) {
                    const finalMatch = AppState.matchState["รอบชิงชนะเลิศ"][0];
                    if (matchIndex === 0) finalMatch.home = { id: `W_F_H`, name: `รอทีมเข้ารอบ...` };
                    else finalMatch.away = { id: `W_F_A`, name: `รอทีมเข้ารอบ...` };
                    Engine.clearMatchResult(finalMatch);
                }
                if (thirdPlaceChecked && AppState.matchState["รอบชิงอันดับที่ 3"]) {
                    const thirdMatch = AppState.matchState["รอบชิงอันดับที่ 3"][0];
                    if (matchIndex === 0) thirdMatch.home = { id: `L_3RD_H`, name: `รอทีมแพ้รอบรองฯ...` };
                    else thirdMatch.away = { id: `L_3RD_A`, name: `รอทีมแพ้รอบรองฯ...` };
                    Engine.clearMatchResult(thirdMatch);
                }
            } else {
                let nextRoundIdx = currentRoundIdx + 1;
                if (rounds[nextRoundIdx] === "รอบชิงอันดับที่ 3") nextRoundIdx++;
                const nextRound = rounds[nextRoundIdx];

                if (nextRound && AppState.matchState[nextRound]) {
                    const nextMatchIdx = Math.floor(matchIndex / 2);
                    const isHomeSlot = (matchIndex % 2 === 0);
                    const nextMatch = AppState.matchState[nextRound][nextMatchIdx];

                    if (isHomeSlot) nextMatch.home = { id: `W_H`, name: `รอทีมเข้ารอบ...` };
                    else nextMatch.away = { id: `W_A`, name: `รอทีมเข้ารอบ...` };
                    
                    Engine.clearMatchResult(nextMatch);
                    Engine.clearDownstream(nextRound, nextMatchIdx, thirdPlaceChecked, pairingSystem); 
                }
            }
        } else {
            for (let i = currentRoundIdx + 1; i < rounds.length; i++) {
                const r = rounds[i];
                AppState.matchState[r].forEach(m => {
                    m.home = { id: `W_WAIT_H`, name: `รอการจับคู่สุ่ม...` };
                    m.away = { id: `W_WAIT_A`, name: `รอการจับคู่สุ่ม...` };
                    Engine.clearMatchResult(m);
                });
            }
        }
    },

    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    advanceTeams: function(round, matchIndex, thirdPlaceChecked, pairingSystem) {
        const rounds = TournamentLogic.getForwardRounds(AppState.teams.length, thirdPlaceChecked);
        if (round === "รอบชิงชนะเลิศ" || round === "รอบชิงอันดับที่ 3") return;

        if (pairingSystem === "direct") {
            const outcome = Engine.getMatchOutcome(AppState.matchState[round][matchIndex]);
            if (!outcome.winner) return;

            const currentRoundIdx = rounds.indexOf(round);

            if (round === "รอบรองชนะเลิศ") {
                if (AppState.matchState["รอบชิงชนะเลิศ"]) {
                    const finalMatch = AppState.matchState["รอบชิงชนะเลิศ"][0];
                    if (matchIndex === 0) finalMatch.home = outcome.winner;
                    else finalMatch.away = outcome.winner;
                }
                if (thirdPlaceChecked && AppState.matchState["รอบชิงอันดับที่ 3"]) {
                    const thirdMatch = AppState.matchState["รอบชิงอันดับที่ 3"][0];
                    if (matchIndex === 0) thirdMatch.home = outcome.loser;
                    else thirdMatch.away = outcome.loser;
                }
            } else {
                let nextRoundIdx = currentRoundIdx + 1;
                if (rounds[nextRoundIdx] === "รอบชิงอันดับที่ 3") nextRoundIdx++;
                
                const nextRound = rounds[nextRoundIdx];
                if (nextRound && AppState.matchState[nextRound]) {
                    const nextMatchIdx = Math.floor(matchIndex / 2);
                    const isHomeSlot = (matchIndex % 2 === 0);
                    const nextMatch = AppState.matchState[nextRound][nextMatchIdx];
                    
                    if (isHomeSlot) nextMatch.home = outcome.winner;
                    else nextMatch.away = outcome.winner;
                }
            }
        } else {
            const allCompleted = AppState.matchState[round].every(m => Engine.getMatchOutcome(m).winner !== null);
            if (!allCompleted) return;

            const currentRoundIdx = rounds.indexOf(round);
            let nextRoundIdx = currentRoundIdx + 1;
            if (rounds[nextRoundIdx] === "รอบชิงอันดับที่ 3") nextRoundIdx++;
            const nextRound = rounds[nextRoundIdx];

            if (!nextRound || !AppState.matchState[nextRound]) return;

            let winners = AppState.matchState[round].map(m => Engine.getMatchOutcome(m).winner);
            Engine.shuffleArray(winners);

            winners.forEach((w, i) => {
                const nextMatchIdx = Math.floor(i / 2);
                const isHomeSlot = (i % 2 === 0);
                if (isHomeSlot) AppState.matchState[nextRound][nextMatchIdx].home = w;
                else AppState.matchState[nextRound][nextMatchIdx].away = w;
            });

            if (round === "รอบรองชนะเลิศ" && thirdPlaceChecked && AppState.matchState["รอบชิงอันดับที่ 3"]) {
                let losers = AppState.matchState[round].map(m => Engine.getMatchOutcome(m).loser);
                Engine.shuffleArray(losers);
                AppState.matchState["รอบชิงอันดับที่ 3"][0].home = losers[0];
                AppState.matchState["รอบชิงอันดับที่ 3"][0].away = losers[1];
            }
        }
    },

    clearMatchResult: function(match) {
        match.leg1 = { h: null, a: null, hp: null, ap: null };
        match.leg2 = { h: null, a: null, hp: null, ap: null };
    },

    // [เพิ่มใหม่] ฟังก์ชันล้างเฉพาะผลการแข่ง (เก็บโครงสร้าง FIFA Day ไว้)
    clearAllMatchResults: function(thirdPlaceChecked, pairingSystem) {
        // แบ็คอัปข้อมูล FIFA Days เอาไว้ก่อน
        const savedFifaDays = { ...AppState.fifaDays };
        
        // สั่งสร้างโครงสร้างสายการแข่งขันใหม่ (เพื่อเคลียร์ทีมไปรอบต่อๆ ไป)
        Engine.generateInitialBracket(thirdPlaceChecked, pairingSystem);
        
        // คืนค่าฟีฟ่าเดย์กลับเข้าไป
        AppState.fifaDays = savedFifaDays;
    }
};