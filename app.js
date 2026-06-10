// app.js
const App = {
    init: function() {
        this.tournamentNameInput = document.getElementById("tournamentNameInput"); // ดึงตัวชื่อทัวร์นาเมนต์ (ใหม่)
        this.csvInput = document.getElementById("csvInput");
        this.legConfigCheck = document.getElementById("legConfigCheck");
        // ... (โค้ดดึง Element อื่นๆ ด้านล่างคงเดิมไว้)
        this.legsContainer = document.getElementById("legsContainer");
        this.thirdPlaceCheck = document.getElementById("thirdPlaceCheck");
        this.tab2Container = document.getElementById("teamListContainer");
        
        // [เพิ่มใหม่] ตัวอ้างอิง DOM ของ Auto OVR
        this.autoOvrCheck = document.getElementById("autoOvrCheck");
        this.autoOvrContainer = document.getElementById("autoOvrContainer");
        this.ovrModWin = document.getElementById("ovrModWin");
        this.ovrModDraw = document.getElementById("ovrModDraw");
        this.ovrModLose = document.getElementById("ovrModLose");
        
        this.bindGlobalEvents();
        this.updateDataFromCSV();
    },

    bindGlobalEvents: function() {
        this.csvInput.addEventListener("input", () => this.updateDataFromCSV());

        this.legConfigCheck.addEventListener("change", () => {
            this.legsContainer.classList.toggle("hidden", !this.legConfigCheck.checked);
            Engine.resetBracket();
            UI.renderLegConfig(this.thirdPlaceCheck.checked);
        });

        this.thirdPlaceCheck.addEventListener("change", () => {
            Engine.resetBracket();
            UI.renderLegConfig(this.thirdPlaceCheck.checked);
        });
        
        // --- ระบบ Auto OVR Config ---
        this.autoOvrCheck.addEventListener("change", () => {
            this.autoOvrContainer.classList.toggle("hidden", !this.autoOvrCheck.checked);
            AppState.autoOvrEnabled = this.autoOvrCheck.checked;
        });

        const updateOvrMods = () => {
            AppState.ovrMod = {
                win: parseInt(this.ovrModWin.value) || 0,
                draw: parseInt(this.ovrModDraw.value) || 0,
                lose: parseInt(this.ovrModLose.value) || 0
            };
        };

        this.ovrModWin.addEventListener("input", updateOvrMods);
        this.ovrModDraw.addEventListener("input", updateOvrMods);
        this.ovrModLose.addEventListener("input", updateOvrMods);

        document.querySelectorAll('input[name="pairing"]').forEach(radio => {
            radio.addEventListener("change", () => {
                Engine.resetBracket();
                if (document.getElementById("tab3").classList.contains("active")) {
                    const pairingSystem = document.querySelector('input[name="pairing"]:checked').value;
                    Engine.generateInitialBracket(this.thirdPlaceCheck.checked, pairingSystem);
                    UI.renderTab3(this.thirdPlaceCheck.checked);
                }
            });
        });

        this.tab2Container.addEventListener("input", (e) => {
            if (e.target.tagName === "INPUT") {
                const index = e.target.dataset.index;
                AppState.teams[index].ovr = e.target.value;
                this.csvInput.value = TournamentLogic.toCSV(AppState.teams);
            }
        });

        const btnCopyExport = document.getElementById("btnCopyExport");
        if (btnCopyExport) {
            btnCopyExport.addEventListener("click", () => {
                const textarea = document.getElementById("exportTextarea");
                if (!textarea.value || textarea.value.startsWith("ยังไม่มีข้อมูล") || textarea.value.startsWith("ระบบยังไม่พบ")) {
                    alert("ไม่มีข้อมูลสำหรับคัดลอก");
                    return;
                }
                textarea.select();
                navigator.clipboard.writeText(textarea.value).then(() => {
                    const originalText = btnCopyExport.innerHTML;
                    btnCopyExport.innerHTML = "✅ คัดลอกเรียบร้อยแล้ว!";
                    btnCopyExport.style.backgroundColor = "#059669";
                    setTimeout(() => {
                        btnCopyExport.innerHTML = originalText;
                        btnCopyExport.style.backgroundColor = "";
                    }, 2000);
                }).catch(err => {
                    alert("เกิดข้อผิดพลาด ไม่สามารถคัดลอกได้");
                });
            });
        }
        
        // --- ปุ่มคัดลอก สกอร์การแข่งขัน (แท็บ 5) ---
        // --- ปุ่มคัดลอก สกอร์การแข่งขัน (แท็บ 5) ---
        const btnCopyScoreExport = document.getElementById("btnCopyScoreExport");
        if (btnCopyScoreExport) {
            btnCopyScoreExport.addEventListener("click", () => {
                const textarea = document.getElementById("exportScoreTextarea");
                if (!textarea.value || textarea.value.startsWith("ยังไม่มีข้อมูล") || textarea.value.startsWith("ระบบยังไม่พบ")) {
                    alert("ไม่มีข้อมูลสำหรับคัดลอก");
                    return;
                }
                textarea.select();
                navigator.clipboard.writeText(textarea.value).then(() => {
                    const originalText = btnCopyScoreExport.innerHTML;
                    btnCopyScoreExport.innerHTML = "✅ คัดลอกสกอร์เรียบร้อยแล้ว!";
                    btnCopyScoreExport.style.backgroundColor = "#059669";
                    setTimeout(() => {
                        btnCopyScoreExport.innerHTML = originalText;
                        btnCopyScoreExport.style.backgroundColor = "";
                    }, 2000);
                }).catch(err => {
                    alert("เกิดข้อผิดพลาด ไม่สามารถคัดลอกได้");
                });
            });
        }
        
        // --- ปุ่มแท็บ 1: ล้างข้อมูลทั้งหมด ---
        const btnClearAll = document.getElementById("btnClearAll");
        if (btnClearAll) {
            btnClearAll.addEventListener("click", () => {
                if(confirm("คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?")) {
                    this.tournamentNameInput.value = "TournamentA"; // รีเซ็ตชื่อทัวร์นาเมนต์กลับเป็นค่าเริ่มต้น
                    this.csvInput.value = "";
                    document.getElementById("coefficientInput").value = "";
                    this.legConfigCheck.checked = false;
                    this.thirdPlaceCheck.checked = false;
                    document.querySelector('input[name="pairing"][value="direct"]').checked = true;
                    
                    AppState.tournamentName = "";
                    AppState.teams = [];
                    AppState.lastTeamCount = 0;
                    AppState.legSelections = {};
                    AppState.fifaDays = {};
                    AppState.matchState = {};
                    
                    this.updateDataFromCSV();
                    UI.renderTeamEditor(); // เคลียร์หน้าแท็บ 2

                    // เคลียร์หน้าแท็บอื่นๆ หากกำลังเปิดอยู่
                    if (document.getElementById("tab3").classList.contains("active")) UI.renderTab3(false);
                    if (document.getElementById("tab4").classList.contains("active")) UI.renderBracket(false);
                    if (document.getElementById("tab5").classList.contains("active")) UI.renderExportTab(false);
                    
                    // เพิ่มโค้ด 6 บรรทัดนี้ต่อท้ายด้านในปุ่ม btnClearAll.addEventListener
                    this.autoOvrCheck.checked = false;
                    this.autoOvrContainer.classList.add("hidden");
                    this.ovrModWin.value = 0;
                    this.ovrModDraw.value = 0;
                    this.ovrModLose.value = 0;
                    AppState.autoOvrEnabled = false;
                    AppState.ovrMod = { win: 0, draw: 0, lose: 0 };
                    
                    alert("ล้างข้อมูลทัวร์นาเมนต์ทั้งหมดเรียบร้อยแล้ว");
                }
            });
        }

        // --- ปุ่มแท็บ 1: ล้างข้อมูลผลการแข่งขัน ---
        const btnClearResults = document.getElementById("btnClearResults");
        if (btnClearResults) {
            btnClearResults.addEventListener("click", () => {
                if(confirm("คุณต้องการล้างเฉพาะ 'ผลการแข่งขัน' ทุกคู่ใช่หรือไม่?\n(รายชื่อทีมและฟีฟ่าเดย์จะยังคงอยู่)")) {
                    const pairingSystem = document.querySelector('input[name="pairing"]:checked').value;
                    Engine.clearAllMatchResults(this.thirdPlaceCheck.checked, pairingSystem);
                    
                    // สั่งวาด UI ใหม่สำหรับแท็บที่กำลังเปิดใช้งาน
                    if (document.getElementById("tab3").classList.contains("active")) {
                        UI.renderTab3(this.thirdPlaceCheck.checked);
                    } else if (document.getElementById("tab4").classList.contains("active")) {
                        UI.renderBracket(this.thirdPlaceCheck.checked);
                    } else if (document.getElementById("tab5").classList.contains("active")) {
                        UI.renderExportTab(this.thirdPlaceCheck.checked);
                    }
                    alert("รีเซ็ตผลการแข่งขันเรียบร้อยแล้ว");
                }
            });
        }
        
        // --- ระบบส่งออกความคืบหน้า (Export - แท็บ 5) ---
        // --- ระบบส่งออกความคืบหน้า (Export - แท็บ 5) ---
        const btnExportProgress = document.getElementById("btnExportProgress");
        if (btnExportProgress) {
            btnExportProgress.addEventListener("click", () => {
                if (Object.keys(AppState.matchState).length === 0) {
                    alert("ยังไม่มีข้อมูลทัวร์นาเมนต์ให้บันทึก");
                    return;
                }

                // 1. ดึงชื่อทัวร์นาเมนต์ (ถ้าไม่กรอกจะให้ชื่อ default ว่า tournament)
                const tName = this.tournamentNameInput.value.trim() || "tournament";
                
                // 2. ดึงเวลา ชม+นาที ปัจจุบัน และทำให้อยู่ในฟอร์แมตเลข 2 หลักเสมอ เช่น (1015)
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                
                // 3. ประกอบรวมกันเป็นชื่อไฟล์ตามเงื่อนไข เช่น abcd(1015).json
                const filename = `${tName}(${hours}${minutes}).json`;

                AppState.tournamentName = tName;

                // รวบรวมข้อมูลสถานะทั้งหมด (State + UI Config)
                const saveData = {
                    appState: AppState,
                    uiState: {
                        csvText: this.csvInput.value,
                        coefficient: document.getElementById("coefficientInput").value,
                        pairingSystem: document.querySelector('input[name="pairing"]:checked').value,
                        thirdPlace: this.thirdPlaceCheck.checked,
                        legConfig: this.legConfigCheck.checked,
                        autoOvr: this.autoOvrCheck.checked,
                        ovrModWin: this.ovrModWin.value,
                        ovrModDraw: this.ovrModDraw.value,
                        ovrModLose: this.ovrModLose.value
                    }
                };

                // สร้างไฟล์ JSON สำหรับดาวน์โหลด
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", filename); // ตั้งชื่อไฟล์แบบไดนามิกที่นี่
                document.body.appendChild(downloadAnchorNode); 
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            });
        }

        // --- ระบบนำเข้าความคืบหน้า (Import - แท็บ 1) ---
        const btnImportProgress = document.getElementById("btnImportProgress");
        const importFile = document.getElementById("importFile");

        if (btnImportProgress && importFile) {
            btnImportProgress.addEventListener("click", () => importFile.click());

            importFile.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                // ค้นหาโค้ดส่วน reader.onload ภายในระบบ Import ความคืบหน้าเดิม
                reader.onload = (event) => {
                    try {
                        const loadData = JSON.parse(event.target.result);
                        
                        // 1. เขียนทับตัวแปร Global State ทั้งหมด
                        Object.assign(AppState, loadData.appState);

                        // 2. คืนค่าการตั้งค่าต่างๆ บนหน้า UI
                        this.tournamentNameInput.value = AppState.tournamentName || "TournamentA"; // คืนค่าชื่อทัวร์นาเมนต์ (ใหม่)
                        
                        const ui = loadData.uiState;
                        this.csvInput.value = ui.csvText;
                        // ... (คืนค่าอื่นๆ ด้านล่างคงเดิมไว้)
                        document.getElementById("coefficientInput").value = ui.coefficient;
                        document.querySelector(`input[name="pairing"][value="${ui.pairingSystem}"]`).checked = true;
                        
                        this.thirdPlaceCheck.checked = ui.thirdPlace;
                        this.thirdPlaceCheck.disabled = false; // เปิดล็อคไว้ก่อน (จะมีการเช็คซ้ำตอนโหลดข้อมูล)

                        this.legConfigCheck.checked = ui.legConfig;
                        this.legsContainer.classList.toggle("hidden", !ui.legConfig);

                        this.autoOvrCheck.checked = ui.autoOvr;
                        this.autoOvrContainer.classList.toggle("hidden", !ui.autoOvr);
                        
                        this.ovrModWin.value = ui.ovrModWin;
                        this.ovrModDraw.value = ui.ovrModDraw;
                        this.ovrModLose.value = ui.ovrModLose;

                        // 3. สั่งวาด UI ส่วนตั้งค่านัดใหม่
                        UI.renderLegConfig(ui.thirdPlace);
                        
                        // 4. สั่งวาดเนื้อหาในแท็บที่เปิดอยู่ปัจจุบันใหม่ (เพื่อแสดงข้อมูลที่โหลดเข้ามา)
                        const activeTab = document.querySelector('.tab-btn.active').dataset.target;
                        if (activeTab === "tab2") UI.renderTeamEditor();
                        else if (activeTab === "tab3") UI.renderTab3(ui.thirdPlace);
                        else if (activeTab === "tab4") UI.renderBracket(ui.thirdPlace);
                        else if (activeTab === "tab5") UI.renderExportTab(ui.thirdPlace);

                        alert("นำเข้าข้อมูลทัวร์นาเมนต์เรียบร้อยแล้ว!");
                    } catch (err) {
                        console.error(err);
                        alert("ไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาดในการอ่านข้อมูล");
                    }
                    
                    // รีเซ็ต Input File เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้ในกรณีที่ต้องการโหลดใหม่
                    importFile.value = "";
                };
                reader.readAsText(file);
            });
        }

        // ระบบเปลี่ยนแท็บ
        const tabBtns = document.querySelectorAll(".tab-btn");
        const tabContents = document.querySelectorAll(".tab-content");

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                tabBtns.forEach(b => b.classList.remove("active"));
                tabContents.forEach(c => c.classList.remove("active"));

                btn.classList.add("active");
                const target = btn.dataset.target;
                document.getElementById(target).classList.add("active");

                const pairingSystem = document.querySelector('input[name="pairing"]:checked').value;

                if (target === "tab2") {
                    UI.renderTeamEditor();
                } else if (target === "tab3") {
                    if (Object.keys(AppState.matchState).length === 0) {
                        Engine.generateInitialBracket(this.thirdPlaceCheck.checked, pairingSystem);
                    }
                    UI.renderTab3(this.thirdPlaceCheck.checked);
                } else if (target === "tab4") {
                    if (Object.keys(AppState.matchState).length === 0) {
                        Engine.generateInitialBracket(this.thirdPlaceCheck.checked, pairingSystem);
                    }
                    UI.renderBracket(this.thirdPlaceCheck.checked);
                } else if (target === "tab5") {
                    UI.renderExportTab(this.thirdPlaceCheck.checked);
                }
            });
        });
    },

    updateDataFromCSV: function() {
        AppState.teams = TournamentLogic.parseCSV(this.csvInput.value);

        if (AppState.teams.length !== AppState.lastTeamCount) {
            this.legConfigCheck.checked = false;
            this.legsContainer.classList.add("hidden");
            AppState.legSelections = {};
            AppState.lastTeamCount = AppState.teams.length;
            Engine.resetBracket();
        }

        const isP2 = TournamentLogic.isPowerOfTwo(AppState.teams.length);
        if (isP2 && AppState.teams.length >= 4) {
            this.thirdPlaceCheck.disabled = false;
        } else {
            this.thirdPlaceCheck.checked = false;
            this.thirdPlaceCheck.disabled = true;
        }

        UI.renderLegConfig(this.thirdPlaceCheck.checked);
    },

    bindMatchEvents: function() {
        const thirdPlaceChecked = this.thirdPlaceCheck.checked;
        const pairingSystem = document.querySelector('input[name="pairing"]:checked').value;

        document.querySelectorAll(".btn-swap").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const round = e.target.dataset.round;
                const idx = e.target.dataset.index;
                const match = AppState.matchState[round][idx];
                
                Engine.clearDownstream(round, idx, thirdPlaceChecked, pairingSystem);

                const temp = match.home;
                match.home = match.away;
                match.away = temp;
                
                Engine.clearMatchResult(match);
                UI.renderFixtures(thirdPlaceChecked);
            });
        });
        
        // --- ปุ่มแท็บ 3: ล้างผลระดับรายแมตช์ ---
        document.querySelectorAll(".btn-clear-match").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const round = e.target.dataset.round;
                const idx = e.target.dataset.index;
                const match = AppState.matchState[round][idx];

                // 1. ล้างผลล่วงหน้าแบบเป็นทอดๆ เพื่อเอาทีมนี้ออกจากรอบถัดไป
                Engine.clearDownstream(round, idx, thirdPlaceChecked, pairingSystem);
                // 2. ล้างคะแนนในแมตช์ปัจจุบัน
                Engine.clearMatchResult(match);
                
                // 3. วาด UI หน้ากระดานใหม่
                UI.renderFixtures(thirdPlaceChecked);
            });
        });

        // (ส่วนบนของฟังก์ชัน bindMatchEvents ยังคงเดิม)
        
        document.querySelectorAll(".btn-random").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const round = e.target.dataset.round;
                const idx = parseInt(e.target.dataset.index);
                const leg = e.target.dataset.leg;
                const match = AppState.matchState[round][idx];

                if(match.home.id.startsWith("W_") || match.home.id.startsWith("L_") || match.away.id.startsWith("W_") || match.away.id.startsWith("L_")) {
                    alert("กรุณารอให้ได้ทีมที่เข้ารอบจากรอบก่อนหน้าก่อนครับ");
                    return;
                }

                // ดึง OVR ล่าสุดของทีมมาคำนวณ (รวมโบนัส Auto OVR แล้ว)
                const homeOvr = Engine.getTeamCurrentOvr(match.home.id);
                const awayOvr = Engine.getTeamCurrentOvr(match.away.id);

                Engine.clearDownstream(round, idx, thirdPlaceChecked, pairingSystem);

                if (!match.isTwoLegs) {
                    // กรณีแข่งนัดเดียว: สุ่มสกอร์และพิจารณาจุดโทษแบบเบ็ดเสร็จ
                    match.leg1 = TournamentLogic.simulateRandomScore(homeOvr, awayOvr, true);
                    Engine.advanceTeams(round, idx, thirdPlaceChecked, pairingSystem); 
                } else {
                    if (leg === "1") {
                        // นัดที่ 1: สุ่มสกอร์ในเวลาอย่างเดียว ไม่ต้องมีจุดโทษ
                        match.leg1 = TournamentLogic.simulateRandomScore(homeOvr, awayOvr, false);
                        match.leg2 = { h: null, a: null, hp: null, ap: null }; 
                    } else if (leg === "2" && match.leg1.h !== null) {
                        // นัดที่ 2: สลับทีมเยือน (awayOvr) ให้เล่นในบ้าน
                        let l2 = TournamentLogic.simulateRandomScore(awayOvr, homeOvr, false); 
                        
                        const aggH = match.leg1.h + l2.a; 
                        const aggA = match.leg1.a + l2.h; 
                        
                        if (aggH === aggA) {
                            // หากสกอร์รวมเสมอ ให้จำลองจุดโทษแยกต่างหาก 
                            // โดยอิง OVR นัดที่ 2 (awayOvr เป็นทีมเหย้ายิงก่อน)
                            const pens = TournamentLogic.simulatePenalties(awayOvr, homeOvr);
                            l2.hp = pens.hp;
                            l2.ap = pens.ap;
                        }
                        match.leg2 = l2;
                        Engine.advanceTeams(round, idx, thirdPlaceChecked, pairingSystem); 
                    } else {
                        alert("กรุณาสุ่มผลนัดแรกก่อนครับ");
                        return;
                    }
                }
                UI.renderFixtures(thirdPlaceChecked);
            });
        });
    }
};

// จุดเริ่มต้นของเว็บ (Entry Point)
document.addEventListener("DOMContentLoaded", () => App.init());