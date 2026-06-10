const TournamentLogic = {
    // แปลงข้อความ CSV เป็น Array Object
    parseCSV: function(text) {
        if (!text.trim()) return [];
        return text.trim().split('\n').map(line => {
            const parts = line.split(',');
            if (parts.length >= 4) {
                return {
                    id: parts[0].trim(),
                    name: parts[1].trim(),
                    match: parts[2].trim(),
                    ovr: parts[3].trim()
                };
            }
            return null;
        }).filter(item => item !== null);
    },

    // แปลง Array Object กลับเป็นข้อความ CSV
    toCSV: function(teams) {
        return teams.map(t => `${t.id}, ${t.name}, ${t.match}, ${t.ovr}`).join('\n');
    },

    // เช็คว่าจำนวนทีมสมมาตรพอที่จะเป็น 2 ยกกำลัง n หรือไม่
    isPowerOfTwo: function(n) {
        return (n >= 2) && ((n & (n - 1)) === 0);
    },

    // สร้างลิสต์ของรอบการแข่งขันทั้งหมด
    getRounds: function(teamCount, hasThirdPlace) {
        let rounds = [];
        let currentTeams = teamCount;
        let isP2 = this.isPowerOfTwo(teamCount);

        while (currentTeams >= 2) {
            if (currentTeams % 2 !== 0) break; 

            if (isP2) {
                if (currentTeams === 2) rounds.push("รอบชิงชนะเลิศ");
                else if (currentTeams === 4) rounds.push("รอบรองชนะเลิศ");
                else if (currentTeams === 8) rounds.push("รอบก่อนรองชนะเลิศ");
                else rounds.push(`รอบ ${currentTeams} ทีมสุดท้าย`);
            } else {
                rounds.push(`รอบ ${currentTeams} ทีมสุดท้าย`);
            }
            currentTeams = currentTeams / 2;
        }

        rounds.reverse();

        if (hasThirdPlace && isP2 && teamCount >= 4) {
            const finalIndex = rounds.indexOf("รอบชิงชนะเลิศ");
            if (finalIndex !== -1) {
                rounds.splice(finalIndex + 1, 0, "รอบชิงอันดับที่ 3");
            }
        }

        return rounds;
    },
    
    getForwardRounds: function(teamCount, hasThirdPlace) {
        let rounds = this.getRounds(teamCount, hasThirdPlace);
        return rounds.reverse(); 
    },

    getResultCode: function(score1, score2, pen1, pen2, isTwoLegged = false) {
        if (score1 > score2) return 'w';
        if (score1 < score2) return 'l';
        
        if (isTwoLegged) {
            return 'd';
        } else {
            if (pen1 !== null && pen2 !== null) {
                if (pen1 > pen2) return 'wp';
                if (pen1 < pen2) return 'lp';
            }
            return 'd';
        }
    },

    // --- [เพิ่มใหม่] อัลกอริทึมจำลองการแข่งขันขั้นสูง (Poisson Distribution) ---

    // 1. ฟังก์ชันสุ่มตัวเลขตามหลักการแจกแจงแบบปัวซง
    poissonRandom: function(expectedValue) {
        const L = Math.exp(-expectedValue);
        let k = 0;
        let p = 1.0;
        while (true) {
            p = p * Math.random();
            if (p <= L) break;
            k++;
        }
        return k;
    },

    // 2. ฟังก์ชันจำลองการดวลจุดโทษ 5 คน + Sudden Death (แยกอิสระ)
    simulatePenalties: function(ovrA, ovrB) {
        const powerDiff = ovrA - ovrB;
        
        // ความน่าจะเป็นในการยิงเข้า (โอกาส 60% ถึง 90%)
        const probA = Math.min(0.9, Math.max(0.6, 0.75 + (powerDiff * 0.002)));
        const probB = Math.min(0.9, Math.max(0.6, 0.75 - (powerDiff * 0.002)));

        let penA = 0, penB = 0;
        let shotsA = 0, shotsB = 0;

        // กติกา 5 คนแรก
        while (shotsA < 5 || shotsB < 5) {
            if (shotsA < 5) {
                shotsA++;
                if (Math.random() < probA) penA++;
                // ขาดลอย (ตามไม่ทันแล้ว)
                if (penA > penB + (5 - shotsB) || penB > penA + (5 - shotsA)) break;
            }
            if (shotsB < 5) {
                shotsB++;
                if (Math.random() < probB) penB++;
                // ขาดลอย (ตามไม่ทันแล้ว)
                if (penA > penB + (5 - shotsB) || penB > penA + (5 - shotsA)) break;
            }
        }

        // ซัดเดนเดธ (Sudden Death)
        while (penA === penB) {
            if (Math.random() < probA) penA++;
            if (Math.random() < probB) penB++;
            if (penA !== penB) break;
        }

        return { hp: penA, ap: penB };
    },

    // 3. ฟังก์ชันจำลองการแข่งขันในเวลาปกติ
    simulateRandomScore: function(homeOvr, awayOvr, needPenalty = false) {
        const powerDiff = homeOvr - awayOvr;

        // คำนวณ Expected Goals (xG) หรือค่า $\lambda$ (ขั้นต่ำ 0.1 ประตู)
        const lambdaA = Math.max(0.1, 1.3 + (powerDiff * 0.03));
        const lambdaB = Math.max(0.1, 1.3 - (powerDiff * 0.03));

        // สุ่มประตูในเวลาปกติ
        const scoreA = this.poissonRandom(lambdaA);
        const scoreB = this.poissonRandom(lambdaB);

        let hp = null;
        let ap = null;

        // หากต้องหาผู้ชนะด้วยจุดโทษ (นัดเดียวจบ)
        if (needPenalty && scoreA === scoreB) {
            const pens = this.simulatePenalties(homeOvr, awayOvr);
            hp = pens.hp;
            ap = pens.ap;
        }

        return { h: scoreA, a: scoreB, hp: hp, ap: ap };
    }
};