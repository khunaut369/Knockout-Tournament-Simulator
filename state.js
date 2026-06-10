// state.js
const AppState = {
    tournamentName: "", // เพิ่มตัวแปรเก็บชื่อทัวร์นาเมนต์ (ใหม่)
    teams: [],
    lastTeamCount: 0,
    legSelections: {},
    fifaDays: {},
    matchState: {},
    autoOvrEnabled: false,
    ovrMod: { win: 0, draw: 0, lose: 0 }
};