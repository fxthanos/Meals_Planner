'use strict';
/* =====================================================================
   §1 — CONSTANTS & TYPES
   ===================================================================== */

const STORAGE_KEYS = Object.freeze({
  STATE:    'mealsPlanner.state.v2',
  CONFIG:   'mealsPlanner.config.v5',
  PROFILES: 'mealsPlanner.profiles.v1'
});

const SEED_DATA = Object.freeze([
  ['i01','باكو شورتي ساده', 11.00],
  ['i02','باتيه', 7.20],
  ['i03','بار حلاوه 40 جرام', 4.31],
  ['i04','بسكويت 4 قطع', 3.50],
  ['i05','بسكويت شاتو', 22.10],
  ['i06','بورشن طحينه', 4.20],
  ['i07','تمر', 9.00],
  ['i08','تونه قطع 185جرام', 65.00],
  ['i09','جبن اسبريد', 31.00],
  ['i10','جبنه دومتي (طبيعى) 250 جرام', 40.00],
  ['i11','جبنه دومتي (نباتى) 125 جرام', 10.95],
  ['i12','جبنه رومي 50 جرام', 13.50],
  ['i13','جبنه قريش 100 جرام', 10.00],
  ['i14','حلاوه اسبريد', 25.00],
  ['i15','حلاوه البوادى', 21.00],
  ['i16','خبز', 2.00],
  ['i17','خيار + طماطم', 5.00],
  ['i18','زبادو 200 مللى', 12.32],
  ['i19','زبادو 400 مللى', 20.68],
  ['i20','سلطه', 7.00],
  ['i21','عبوه شويبس 240 مللى', 11.59],
  ['i22','عسل ابيض 225 جرام', 40.37],
  ['i23','عسل أسود 350 جرام', 20.27],
  ['i24','عصير بيتى 200 ملم', 5.33],
  ['i25','علبه بسكويت 46 جرام', 27.30],
  ['i26','علبه جبنه مثلثات (8 قطع)', 29.36],
  ['i27','فطير 350 جرام', 19.00],
  ['i28','فول 400 جرام', 15.17],
  ['i29','قطعه جبنه مثلثات', 3.67],
  ['i30','كيس شيبسي', 5.00],
  ['i31','مربى 230 جرام', 23.10],
  ['i32','مربي 100 جرام', 6.34],
  ['i33','هوهوز كيك', 40.00]
]);

/* i21 = مشروب غازي مستقل. i30 = كيس شيبسي مطلوب في كل وجبة. */
const SEED_META = Object.freeze({
  i01:{ classification:'snack',     category:'بسكويت مالح',     unit:'باكو',           family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i02:{ classification:'pastry',    category:'معجنات',          unit:'قطعة',           family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i03:{ classification:'sweet',     category:'حلويات',          unit:'بار 40 جرام',    family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i04:{ classification:'sweet',     category:'بسكويت',          unit:'كيس 4 قطع',      family:'biscuit',        specialRules:['biscuit_family'],                                nutrition:{sugar:'medium',sodium:'low'} },
  i05:{ classification:'sweet',     category:'بسكويت',          unit:'باكو',           family:'biscuit',        specialRules:['biscuit_family'],                                nutrition:{sugar:'high',sodium:'low'} },
  i06:{ classification:'other',     category:'طحينة',           unit:'بورشن',          family:'',               specialRules:['tahini_only_with_black_honey'],                  nutrition:{sugar:'low',sodium:'low'} },
  i07:{ classification:'fruit',     category:'فواكه',           unit:'حصة',            family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i08:{ classification:'protein',   category:'معلبات',          unit:'علبة 185 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i09:{ classification:'dairy',     category:'جبن مطحون',       unit:'برطمان',         family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i10:{ classification:'dairy',     category:'جبن طبيعي',       unit:'علبة 250 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i11:{ classification:'dairy',     category:'جبن نباتي',       unit:'علبة 125 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i12:{ classification:'dairy',     category:'جبن رومي',        unit:'قطعة 50 جرام',   family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i13:{ classification:'dairy',     category:'جبن قريش',        unit:'علبة 100 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'medium'} },
  i14:{ classification:'sweet',     category:'حلاوة طحينية',    unit:'برطمان',         family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i15:{ classification:'sweet',     category:'حلاوة طحينية',    unit:'علبة',           family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} },
  i16:{ classification:'bread',     category:'خبز',             unit:'رغيف',           family:'bread',          specialRules:['bread_family'],                                  nutrition:{sugar:'low',sodium:'medium'} },
  i17:{ classification:'vegetable', category:'خضروات طازجة',    unit:'حصة',            family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'low'} },
  i18:{ classification:'beverage',  category:'مشروب زبادي',     unit:'علبة 200 مل',    family:'yogurt',         specialRules:['yogurt_family'],                                 nutrition:{sugar:'medium',sodium:'low'} },
  i19:{ classification:'beverage',  category:'مشروب زبادي',     unit:'علبة 400 مل',    family:'yogurt',         specialRules:['yogurt_family'],                                 nutrition:{sugar:'medium',sodium:'low'} },
  i20:{ classification:'vegetable', category:'سلطة',            unit:'علبة',           family:'',               specialRules:['required_with_beans','required_with_tuna'],      nutrition:{sugar:'low',sodium:'medium'} },
  /* شويبس: مشروب غازي مستقل تمامًا — لا علاقة له بالشيبسي */
  i21:{ classification:'beverage',  category:'مشروب غازي',      unit:'عبوة 240 مل',    family:'',               specialRules:[],                                                nutrition:{sugar:'medium',sodium:'high'} },
  i22:{ classification:'sweet',     category:'عسل أبيض',        unit:'برطمان 225 جرام',family:'honey',          specialRules:['honey_family'],                                  nutrition:{sugar:'high',sodium:'low'} },
  i23:{ classification:'sweet',     category:'عسل أسود',        unit:'برطمان 350 جرام',family:'honey',          specialRules:['honey_family'],                                  nutrition:{sugar:'high',sodium:'low'} },
  i24:{ classification:'beverage',  category:'عصير',            unit:'علبة 200 مل',    family:'juice',          specialRules:['juice_family'],                                  nutrition:{sugar:'high',sodium:'low'} },
  i25:{ classification:'sweet',     category:'بسكويت',          unit:'علبة 46 جرام',   family:'biscuit',        specialRules:['biscuit_family'],                                nutrition:{sugar:'high',sodium:'low'} },
  i26:{ classification:'dairy',     category:'جبن مثلثات',      unit:'علبة 8 قطع',     family:'triangle_cheese',specialRules:['counts_as_cheese'],                              nutrition:{sugar:'low',sodium:'high'} },
  i27:{ classification:'pastry',    category:'فطير',            unit:'علبة 350 جرام',  family:'pastry',         specialRules:['pastry_family'],                                 nutrition:{sugar:'low',sodium:'high'} },
  i28:{ classification:'protein',   category:'بقوليات',         unit:'علبة 400 جرام',  family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i29:{ classification:'dairy',     category:'جبن مثلثات',      unit:'قطعة',           family:'triangle_cheese',specialRules:['counts_as_cheese','required_with_beans','required_with_tuna','required_with_jam'], nutrition:{sugar:'low',sodium:'high'} },
  /* شيبسي: مقرمشات — مطلوب في كل وجبة. لا علاقة له بالشويبس. */
  i30:{ classification:'snack',     category:'شيبسي',           unit:'كيس',            family:'',               specialRules:[],                                                nutrition:{sugar:'low',sodium:'high'} },
  i31:{ classification:'sweet',     category:'مربى',            unit:'برطمان 230 جرام',family:'jam',            specialRules:['jam_family'],                                    nutrition:{sugar:'high',sodium:'low'} },
  i32:{ classification:'sweet',     category:'مربى',            unit:'برطمان 100 جرام',family:'jam',            specialRules:['jam_family'],                                    nutrition:{sugar:'high',sodium:'low'} },
  i33:{ classification:'sweet',     category:'كيك',             unit:'قطعة',           family:'',               specialRules:[],                                                nutrition:{sugar:'high',sodium:'low'} }
});

const ALL_TAGS = Object.freeze([
  'forbidden_with_fasting','required_with_beans','required_with_tuna','required_with_jam',
  'tahini_only_with_black_honey','counts_as_cheese','honey_family',
  'jam_family','yogurt_family','bread_family','pastry_family','biscuit_family','juice_family'
]);

const TAG_LABELS = Object.freeze({
  forbidden_with_fasting:'ممنوع مع الصيام', required_with_beans:'مطلوب مع الفول',
  required_with_tuna:'مطلوب مع التونة', required_with_jam:'مطلوب مع المربى',
  tahini_only_with_black_honey:'طحينة مع العسل الأسود فقط', counts_as_cheese:'يُحتسب كجبن',
  honey_family:'عائلة العسل', jam_family:'عائلة المربى',
  yogurt_family:'عائلة مشروب الزبادي', bread_family:'عائلة الخبز', pastry_family:'عائلة المعجنات',
  biscuit_family:'عائلة البسكويت', juice_family:'عائلة العصير'
});

const FAMILY_FROM_TAG = Object.freeze({
  honey_family:'honey', jam_family:'jam',
  yogurt_family:'yogurt', bread_family:'bread', pastry_family:'pastry',
  biscuit_family:'biscuit', juice_family:'juice'
});

const CLASSIFICATIONS = Object.freeze([
  {v:'',l:'غير محدد – يتطلب إدخال المستخدم'},
  {v:'protein',l:'بروتين'},{v:'carb',l:'كربوهيدرات'},{v:'dairy',l:'ألبان'},
  {v:'sweet',l:'حلويات'},{v:'snack',l:'سناكس'},{v:'vegetable',l:'خضروات'},
  {v:'fruit',l:'فواكه'},{v:'beverage',l:'مشروبات'},{v:'bread',l:'خبز'},
  {v:'pastry',l:'معجنات'},{v:'other',l:'أخرى'}
]);

const RULE_NAMES = Object.freeze({
  R1:'التكوين', R2:'التغطية', R3:'الشيبسي', R4:'الخبز/الفطير',
  R5:'مجموعات الاستبعاد', R6:'السلطة/الخيار', R7:'جبنة المثلثات',
  R8:'الطحينة', F1:'التكلفة', F2:'الهدف', NUT:'التوازن'
});

const MEAL_RULE_ORDER = Object.freeze(['R1','R3','R4','R5','R6','R7','R8','NUT','F1']);

const CUSTOM_RULE_TYPES = Object.freeze({
  exclusiveGroup:{ label:'مجموعة استبعاد', hint:'لا يجتمع أكثر من عنصر واحد من هذه المجموعة', icon:'🚫' },
  forbidPair:{ label:'منع ثنائي', hint:'عنصران لا يجتمعان أبدًا', icon:'⛔' },
  forbidWith:{ label:'منع شرطي', hint:'عنصر ممنوع عند وجود أي من المُشغِّلات', icon:'🚷' },
  requireWith:{ label:'إلزام شرطي', hint:'عند وجود أي من المُشغِّلات، تُضاف العناصر المطلوبة', icon:'✅' },
  allowOnlyWith:{ label:'سماح مشروط', hint:'عنصر مسموح فقط مع عناصر محددة', icon:'🔓' }
});

const SEVERITY = Object.freeze({ ERROR:'error', WARNING:'warning', INFO:'info' });

