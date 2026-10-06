import { TOPICS } from './topics.js';
import { W_FAMILY } from './family.js';
import { W_SCHOOL } from './school.js';
import { W_FOOD } from './food.js';
import { W_HOME } from './home.js';
import { W_CLOTHES } from './clothes.js';
import { W_BODY } from './body.js';
import { W_SPORT } from './sport.js';
import { W_HOBBIES } from './hobbies.js';
import { W_TRAVEL } from './travel.js';
import { W_PLACES } from './places.js';
import { W_WEATHER } from './weather.js';
import { W_ANIMALS } from './animals.js';
import { W_NATURE } from './nature.js';
import { W_SHOPPING } from './shopping.js';
import { W_WORK } from './work.js';
import { W_TECH } from './tech.js';
import { W_TIME } from './time.js';
import { W_NUMBERS } from './numbers.js';
import { W_FEELINGS } from './feelings.js';
import { W_VERBS } from './verbs.js';
import { W_DESCRIBE } from './describe.js';
import { W_FUNCTION } from './function.js';

const RAW_WORDS = {
  family: W_FAMILY,
  school: W_SCHOOL,
  food: W_FOOD,
  home: W_HOME,
  clothes: W_CLOTHES,
  body: W_BODY,
  sport: W_SPORT,
  hobbies: W_HOBBIES,
  travel: W_TRAVEL,
  places: W_PLACES,
  weather: W_WEATHER,
  animals: W_ANIMALS,
  nature: W_NATURE,
  shopping: W_SHOPPING,
  work: W_WORK,
  tech: W_TECH,
  time: W_TIME,
  numbers: W_NUMBERS,
  feelings: W_FEELINGS,
  verbs: W_VERBS,
  describe: W_DESCRIBE,
  function: W_FUNCTION,
};

export const WORDS = TOPICS.flatMap(t => RAW_WORDS[t.key].map(([en, ipa, pos, zh, ex, exZh]) => ({ id: en, en, ipa, pos, zh, topic: t.key, ex, exZh })));

export const WORD_BY_ID = new Map(WORDS.map(w => [w.id, w]));
