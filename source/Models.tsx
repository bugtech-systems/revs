import Realm, {BSON} from 'realm';

export class Betting extends Realm.Object<Betting> {
  _id!: BSON.ObjectId;
  isComplete!: boolean;
  isDeleted!: boolean;
  isValidated?: Date;
  timestamp?: Date;
  inputType!: 'normal' | 'upload' | 'sold';
  straight!: number;
  ramble!: number;
  gross!: number;
  net!: number;
  isWinTo!: boolean; 
  isPrint!: boolean; 
  collector!: string;
  owner_id!: string;
  printCopy?: number;
  user?: Users;
  draw?: Draws;
  fileUrl?: string;
  note?: string;
  contact?: string;
  winning?: number;
  ticketNo?: string;
  gameTime!: '2pm' | '5pm' | '9pm';
  hits?: Combination[];
  combinations?: Combination[]; 
  commissions?: Commission[];
  uplines?: string[];

  static schema: Realm.ObjectSchema = {
    name: 'bettings',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new BSON.ObjectId() },
      isDeleted: { type: 'bool', default: false },
      isComplete: { type: 'bool', default: false },
      isValidated: 'date?',
      timestamp: 'date?',
      straight: 'double',
      ramble: 'double',
      gross: 'double',
      net: 'double',
      isPrint: {type: 'bool', default: false},
      isWinTo: {type: 'bool', default: false},
      inputType: { type: 'string', default: 'normal' },
      fileUrl: 'string?',
      collector: 'string',
      owner_id: 'string',
      printCopy: 'double?',
      draw: 'draws?',
      user: 'users?',
      note: 'string?',
      contact: 'string?',
      ticketNo: 'string?',
      winning: 'double?',
      gameTime: { type: 'string', default: '2pm' },
      hits: { type: 'list', objectType: 'combination' },
      commissions: { type: 'list', objectType: 'commission' },
      uplines: { type: 'list', objectType: 'string'},
      combinations: { type: 'list', objectType: 'combination' }
    }
  };
}
export class Commission extends Realm.Object<Commission> {
  referral!: string;
  rate!: number;
  amount!: number;
  userLevel?: string;

  static schema: Realm.ObjectSchema = {
    name: 'commission',
    embedded: true,
    properties: {
      referral: 'string',
      rate: { type: 'double', default: 0 },
      amount: { type: 'double', default: 0 },
      userLevel: 'string?',
    }
  };
}
export class Combination extends Realm.Object<Combination> {
  _id!: BSON.ObjectId;
  combination!: string;
  betType!: string;
  isWinTo!: boolean; 
  winning?: number;
  amount?: number;
  targetAmount?: number;
  rambleAmount?: number;


  static schema: Realm.ObjectSchema = {
    name: 'combination',
    embedded: true, // default: false
    properties: {
      _id: { type: 'objectId', default: () => new BSON.ObjectId() },
      combination: 'string',
      betType: 'string',
      isWinTo: {type: 'bool', default: false},
      winning: 'double?',
      amount: 'double?',
      targetAmount: { type: 'double', default: 0},
      rambleAmount: { type: 'double', default: 0},

    }
  };
}
export class Users extends Realm.Object<Users> {
  _id!: Realm.BSON.ObjectId;
  firstName!: string;
  lastName!: string;
  role!: 'admin' | 'coordinator' | 'teller';
  email!: string;
  password!: string;
  isDeleted!: boolean;
  isAdmin!: boolean;
  address?: string;
  receiptTemplate?: 'samar' | 'tacloban';
  commission?: number;
  mobile?: string;
  uplines?: Users[];
  configuration?: Configuration[];
  referral?: string;
  userLevel!: number;
  comRate!: number;
  comPortion!: number;
  coordinates?: string;
  grossToday?: number;
  appVersion?: string;
  lastSummary?: Date;
  createdAt!: Date;
  updatedAt!: Date;

  static schema = {
    name: 'users',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new BSON.ObjectId() },
      firstName: { type: 'string', indexed: true },
      lastName: { type: 'string', indexed: true },
      role: { type: 'string', default: 'teller', indexed: true },
      receiptTemplate: 'string?',
      email: { type: 'string', indexed: true },
      password: 'string',
      isDeleted: { type: 'bool', default: false },
      isAdmin: { type: 'bool', default: false },
      address: 'string?',
      commission: 'double?',
      grossToday: 'double?',
      coordinates: 'string?',
      mobile: 'string?',
      uplines: { type: 'list', objectType: 'users' },
      referral: 'string?',
      userLevel: { type: 'int', default: 0 },
      comRate: { type: 'double', default: 0 },
      comPortion: { type: 'double', default: 0 },
      appVersion: 'string?',
      configuration: { type: 'list', objectType: 'configuration' },
      lastSummary: 'date?',
      createdAt: { type: 'date', default: () => new Date() },
      updatedAt: { type: 'date', default: () => new Date() }
      
    },
  };
}
export class Draws extends Realm.Object<Draws> {
  _id!: Realm.BSON.ObjectId;
  gameType!: 'swertres';
  gameTime!: '2pm' | '5pm' | '9pm';
  combination?: string;
  grossTotal!: number;
  winTotal?: number;
  netTotal?: number;
  soldOutTotal?: number;
  drawDate!: Date;
  isWinTo!: boolean; 
  tipUrl?: string;



  static schema: Realm.ObjectSchema = {
    name: 'draws',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      gameType: { type: 'string', default: 'swertres' },
      gameTime: { type: 'string', default: '2pm' },
      isWinTo: {type: 'bool', default: false},
      combination: 'string?',
      grossTotal: 'double',
      winTotal: 'double?',
      netTotal: 'double?',
      soldOutTotal: 'double?',
      drawDate: 'date?',
      tipUrl: 'string?'
    }
  };
}
export class Combinations extends Realm.Object<Combinations> {
  _id!: Realm.BSON.ObjectId;
  digit!: string;
  straightLimit!: number;
  rambleLimit!: number;
  rambleTotal!: number;
  straightTotal!: number;
  isWinTo!: boolean; 

  static schema: Realm.ObjectSchema = {
    name: 'combinations',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      digit: 'string',
      straightLimit:  { type: 'double', default:  0},
      rambleLimit:  { type: 'double', default:  0},
      rambleTotal:  { type: 'double', default:  0},
      straightTotal:  { type: 'double', default:  0},
      isWinTo: {type: 'bool', default: false},
    }
  };
}
export class Configuration extends Realm.Object<Configuration> {
  title!: string;
  isCheck?: boolean;
  value?: string;

  static schema: Realm.ObjectSchema = {
    name: 'configuration',
    embedded: true,
    properties: {
      title: 'string',
      isCheck: { type: 'bool', default: false },
      value: 'string?',
    }
  };
}

export class Conversation extends Realm.Object<Conversation> {
  owner_id!: string;
  imageUrl?: string; 
  message!: string;
  isViewed?: boolean;
  createdAt!: Date;
  
  static schema: Realm.ObjectSchema = {
    name: 'conversation',
    embedded: true,
    properties: {
      imageUrl: 'string?',
      owner_id: 'string',
      message: 'string',
      isViewed: { type: 'bool', default: false },
      createdAt: { type: 'date', default: () => new Date() },
    }
  };
}


export class Messages extends Realm.Object<Messages> {
  _id!: Realm.BSON.ObjectId;
  createdBy?: string;
  recepient?: string;
  recepientName?: string;
  conversations?: Conversation[];
  isDeleted?: Boolean;
  createdAt?: Date;
  updatedAt?: Date;
  

  static schema: Realm.ObjectSchema = {
    name: 'messages',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      createdBy: 'string?',
      recepient: 'string?',
      recepientName: 'string?',
      conversations: { type: 'list', objectType: 'conversation' },
      isDeleted: { type: 'bool', default: false },
      createdAt: { type: 'date', default: () => new Date() },
      updatedAt: { type: 'date', default: () => new Date() },
    }
  };
};