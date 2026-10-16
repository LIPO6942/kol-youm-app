import { comparePlaces, findSimilarPlaceInZone } from '../src/lib/place-matching-utils.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- STARTING PLACE MATCHING & DUPLICATE DETECTION TESTS ---\n');

// TEST 1 : Identical raw name (case insensitive)
function test1() {
  const res = comparePlaces('Cosmitto', 'cosmitto');
  assert(res.isMatch === true, 'Test 1 failed: Should match identical raw name');
  assert(res.score === 100, `Test 1 failed: Expected score 100, got ${res.score}`);
  console.log('✅ TEST 1 PASSED: Identical raw name with case insensitivity.');
}

// TEST 2 : Accents and punctuation variations ("Plan-B" vs "Plan B", "Café des Délices" vs "Cafe des Delices")
function test2() {
  const res1 = comparePlaces('Plan-B', 'Plan B');
  assert(res1.isMatch === true, 'Test 2.1 failed: Plan-B vs Plan B should match');

  const res2 = comparePlaces('Café des Délices', 'Cafe des Delices');
  assert(res2.isMatch === true, 'Test 2.2 failed: Accents variation should match');
  console.log('✅ TEST 2 PASSED: Accents, hyphens and punctuation normalization.');
}

// TEST 3 : Category stop-words / prefixes ("Café Journal" vs "Le Journal")
function test3() {
  const res1 = comparePlaces('Café Journal', 'Le Journal');
  assert(res1.isMatch === true, 'Test 3.1 failed: Café Journal vs Le Journal should match');

  const res2 = comparePlaces('Restaurant Origami', 'Origami');
  assert(res2.isMatch === true, 'Test 3.2 failed: Restaurant Origami vs Origami should match');

  const res3 = comparePlaces('Chez Slah', 'Slah');
  assert(res3.isMatch === true, 'Test 3.3 failed: Chez Slah vs Slah should match');
  console.log('✅ TEST 3 PASSED: Category stop-words and prefixes (Café, Restaurant, Chez, Le/La).');
}

// TEST 4 : Minor typo / fuzzy match ("Cosmitto" vs "Cosmito")
function test4() {
  const res1 = comparePlaces('Cosmitto', 'Cosmito');
  assert(res1.isMatch === true, 'Test 4.1 failed: Cosmitto vs Cosmito should match');
  assert(res1.score >= 80, `Test 4.1 failed: Expected score >= 80, got ${res1.score}`);

  const res2 = comparePlaces('Gourmandise', 'Gourmandize');
  assert(res2.isMatch === true, 'Test 4.2 failed: Gourmandise vs Gourmandize should match');
  console.log('✅ TEST 4 PASSED: Minor typos and fuzzy distance matching.');
}

// TEST 5 : Substring inclusion for meaningful names ("Paul" vs "Paul Bakery", "Origami" vs "Origami Sushi Bar")
function test5() {
  const res1 = comparePlaces('Paul', 'Paul Bakery');
  assert(res1.isMatch === true, 'Test 5.1 failed: Paul vs Paul Bakery should match');

  const res2 = comparePlaces('Origami', 'Origami Sushi Bar');
  assert(res2.isMatch === true, 'Test 5.2 failed: Origami vs Origami Sushi Bar should match');
  console.log('✅ TEST 5 PASSED: Substring / meaningful keyword inclusion.');
}

// TEST 6 : Truly different places should NOT match
function test6() {
  const res1 = comparePlaces('Le Corail', 'Le Capitole');
  assert(res1.isMatch === false, 'Test 6.1 failed: Le Corail and Le Capitole should not match');

  const res2 = comparePlaces('Cosmitto', 'Barista');
  assert(res2.isMatch === false, 'Test 6.2 failed: Cosmitto and Barista should not match');

  const res3 = comparePlaces('Wok', 'Bar');
  assert(res3.isMatch === false, 'Test 6.3 failed: Very short different words should not match');
  console.log('✅ TEST 6 PASSED: Truly different places are not flagged as duplicates.');
}

// TEST 7 : Zone-wide search across categories
function test7() {
  const zoneCategories = {
    cafes: ['Cosmitto Coffee', 'Le Journal', 'Paul'],
    restaurants: ['Origami Sushi Bar', 'La Spiga', 'Le Baroque'],
    fastFoods: ['Plan B', 'Baguette & Baguette']
  };

  // Same category match
  const matchSameCat = findSimilarPlaceInZone('Cosmito', zoneCategories, 'cafes');
  assert(matchSameCat !== null, 'Test 7.1 failed: Cosmito should find Cosmitto Coffee');
  assert(matchSameCat?.isSameCategory === true, 'Test 7.1 failed: Should be marked as same category');
  assert(matchSameCat?.existingName === 'Cosmitto Coffee', 'Test 7.1 failed: Wrong existing name');

  // Cross category match (adding to cafes when already in restaurants)
  const matchCrossCat = findSimilarPlaceInZone('Origami', zoneCategories, 'cafes');
  assert(matchCrossCat !== null, 'Test 7.2 failed: Origami should be found in restaurants');
  assert(matchCrossCat?.isSameCategory === false, 'Test 7.2 failed: Should be marked as different category');
  assert(matchCrossCat?.categoryDisplayName === 'Restaurants', 'Test 7.2 failed: Category should be Restaurants');

  // Prefix match
  const matchPrefix = findSimilarPlaceInZone('Café Journal', zoneCategories, 'cafes');
  assert(matchPrefix !== null, 'Test 7.3 failed: Café Journal should match Le Journal');

  // Fast food punctuation match
  const matchPunct = findSimilarPlaceInZone('Plan-B', zoneCategories, 'fastFoods');
  assert(matchPunct !== null, 'Test 7.4 failed: Plan-B should match Plan B');

  // No match
  const noMatch = findSimilarPlaceInZone('Le Golfe', zoneCategories, 'restaurants');
  assert(noMatch === null, 'Test 7.5 failed: Le Golfe should not match anything');

  console.log('✅ TEST 7 PASSED: Zone-wide search across categories with same-category detection.');
}

try {
  test1();
  test2();
  test3();
  test4();
  test5();
  test6();
  test7();
  console.log('\n🎉 ALL 7 TESTS PASSED SUCCESSFULLY!');
} catch (e: any) {
  console.error('\n❌ TEST RUN FAILED:', e.message);
  process.exit(1);
}
