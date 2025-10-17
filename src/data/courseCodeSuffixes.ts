// based on course types fetch semester data from redis/postgres then build schedule with all options,
// let user decide what should be included like winter break, reading week and possibly deadlines

// for now law students will have to manually add C courses and D cousres will have to as well
// TODO: fix c and d
export type courseTypes =
  | "1st Quarter"
  | "2nd Quarter"
  | "3rd Quarter"
  | "4th Quarter"
  | "First"
  | "Second"
  | "Full"
  | "Accelarated"
  | "Accelarated First"
  | "Accelarated Second"
  | "Accelarated(6 weeks)"
  | "Accelareted(8 weeks)"
  | "February/March/April (FMA)"
  | "HBA1 Ivey"
  | "Unassigned"
  | "Other Session"
  | "Faculty of Education"
  | "C is cooked";

type course = {
  [key: string]: {
    suffix: string;
    type: courseTypes;
    credit: number | null;
  };
};

// we can figure out when a course happens based on the type, credit and key
// !credits will not always work like accelareted courses
// TODO: FMA, C courses needs to be added
export const courseCodesSuffixesMap: course = {
  NO_SUFFIX: {
    suffix: "NO_SUFFIX",
    type: "Full",
    credit: 1,
  },
  A: {
    suffix: "A",
    type: "First",
    credit: 0.5,
  },
  B: {
    suffix: "B",
    type: "Second",
    credit: 0.5,
  },
  //   TODO: fix c it's chopped
  C: {
    suffix: "C",
    type: "C is cooked",
    credit: null,
  },

  // D is cooked
  D: {
    suffix: "D",
    type: "February/March/April (FMA)",
    credit: null,
  },
  E: {
    suffix: "E",
    type: "Full",
    credit: 1,
  },
  F: {
    suffix: "F",
    type: "First",
    credit: 0.5,
  },
  G: {
    suffix: "G",
    type: "Second",
    credit: 0.5,
  },
  H: {
    suffix: "H",
    type: "Accelareted(8 weeks)",
    credit: 1,
  },
  J: {
    suffix: "J",
    type: "Accelarated(6 weeks)",
    credit: 1,
  },
  K: {
    suffix: "K",
    type: "HBA1 Ivey",
    credit: 0.75,
  },
  L: {
    suffix: "L",
    type: "Unassigned",
    credit: 0,
  },
  M: {
    suffix: "M",
    type: "Unassigned",
    credit: 0,
  },
  N: {
    suffix: "N",
    type: "Unassigned",
    credit: 0,
  },
  P: {
    suffix: "P",
    type: "Unassigned",
    credit: 0,
  },
  Q: {
    suffix: "Q",
    type: "1st Quarter",
    credit: 0.25,
  },
  R: {
    suffix: "R",
    type: "2nd Quarter",
    credit: 0.25,
  },
  S: {
    suffix: "S",
    type: "3rd Quarter",
    credit: 0.25,
  },
  T: {
    suffix: "T",
    type: "4th Quarter",
    credit: 0.25,
  },
  U: {
    suffix: "U",
    type: "Other Session",
    credit: 0.25,
  },
  V: {
    suffix: "V",
    type: "Faculty of Education",
    credit: 0.375,
  },
  W: {
    suffix: "W",
    type: "Accelarated First",
    credit: 0.5,
  },
  X: {
    suffix: "X",
    type: "Accelarated Second",
    credit: 0.5,
  },
  Y: {
    suffix: "Y",
    type: "Other Session",
    credit: 0.5,
  },
  Z: {
    suffix: "Z",
    type: "Other Session",
    credit: 0.5,
  },
};
