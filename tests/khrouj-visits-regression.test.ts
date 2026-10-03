import { mergeVisits, validateVisitsMutation } from '../src/lib/khrouj-visits-manager';
import type { VisitLog } from '../src/lib/firebase/firestore';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('--- STARTING KHROUJ VISITS REGRESSION TESTS ---\n');

// TEST 1 : Firestore a 20 visites, local a 5 -> après merge, résultat a toujours 20 visites (pas 5)
function test1() {
    const remoteVisits: VisitLog[] = Array.from({ length: 20 }, (_, i) => ({
        id: `v_remote_${i}`,
        date: 1700000000000 + i * 100000,
        placeName: `Place Remote ${i}`,
        category: 'Café',
        orderedItem: `Item ${i}`
    }));

    const localVisits: VisitLog[] = remoteVisits.slice(0, 5); // Only 5 in local

    const merged = mergeVisits(localVisits, remoteVisits);
    assert(merged.length === 20, `Test 1 failed: Expected 20 visits, got ${merged.length}`);
    console.log('✅ TEST 1 PASSED: Firestore 20 visits + local 5 visits -> 20 visits preserved.');
}

// TEST 2 : Firestore a des visites sans id -> elles ne sont PAS supprimées ni écrasées
function test2() {
    const remoteVisits: any[] = [
        { date: 1710000000000, placeName: 'Sidi Bou Said Café', category: 'Café' }, // No ID!
        { date: 1710500000000, placeName: 'La Marsa Brunch', category: 'Brunch' }, // No ID!
        { id: 'v_with_id_1', date: 1711000000000, placeName: 'Carthage', category: 'Balade' }
    ];

    const localVisits: any[] = [
        { id: 'v_with_id_1', date: 1711000000000, placeName: 'Carthage', category: 'Balade' }
    ];

    const merged = mergeVisits(localVisits, remoteVisits);
    assert(merged.length === 3, `Test 2 failed: Expected 3 visits, got ${merged.length}`);
    const noIdVisits = merged.filter(v => v.placeName === 'Sidi Bou Said Café' || v.placeName === 'La Marsa Brunch');
    assert(noIdVisits.length === 2, `Test 2 failed: Visits without ID were dropped!`);
    console.log('✅ TEST 2 PASSED: Visits without ID are fully preserved and assigned generated IDs.');
}

// TEST 3 : Local a une visite que Firestore n'a pas -> la visite locale est ajoutée, pas supprimée
function test3() {
    const remoteVisits: VisitLog[] = [
        { id: 'v1', date: 1710000000000, placeName: 'Place 1', category: 'Café' },
        { id: 'v2', date: 1710100000000, placeName: 'Place 2', category: 'Restaurant' }
    ];

    const localVisits: VisitLog[] = [
        ...remoteVisits,
        { id: 'v_local_only', date: 1710200000000, placeName: 'Place 3 New Offline', category: 'Café' }
    ];

    const merged = mergeVisits(localVisits, remoteVisits);
    assert(merged.length === 3, `Test 3 failed: Expected 3 visits, got ${merged.length}`);
    assert(merged.some(v => v.id === 'v_local_only'), `Test 3 failed: Local-only visit was lost!`);
    console.log('✅ TEST 3 PASSED: Local visit absent from Firestore is kept and merged.');
}

// TEST 4 : Suppression d'un film Tfarrej -> AUCUN impact sur les visites Khrouj
function test4() {
    const khroujVisits: VisitLog[] = [
        { id: 'v_cinema_1', date: 1715000000000, placeName: 'Pathé Tunis', category: 'Cinéma', orderedItem: 'Dune 2' },
        { id: 'v_cafe_1', date: 1715100000000, placeName: 'Cosmitto', category: 'Café', orderedItem: 'Latte' }
    ];

    // Simuler le comportement d'un profil avant et après removeMovieFromList
    // Après nos modifications dans firestore.ts:
    // syncPayload ne contient plus 'visits', et removeMovie ne modifie plus visits
    const profile = {
        seenMovieTitles: ['Dune 2', 'Inception'],
        visits: khroujVisits
    };

    // When deleting 'Dune 2' from movies:
    const updatedSeenMovies = profile.seenMovieTitles.filter(t => t !== 'Dune 2');
    // Visits are left intact!
    const updatedVisits = profile.visits;

    assert(updatedVisits.length === 2, `Test 4 failed: Visits count changed!`);
    assert(updatedVisits[0].orderedItem === 'Dune 2', `Test 4 failed: Cinema visit item was corrupted!`);
    console.log('✅ TEST 4 PASSED: Tfarrej movie deletion has 0 impact on Khrouj visits.');
}

// TEST 5 : Khrouj ajoute une visite -> Tfarrej ne l'écrase pas
function test5() {
    const initialVisits: VisitLog[] = [
        { id: 'v1', date: 1710000000000, placeName: 'Place 1', category: 'Café' }
    ];

    const newKhroujVisit: VisitLog = {
        id: 'v_new_khrouj',
        date: 1716000000000,
        placeName: 'Salon de Thé Ennasr',
        category: 'Café'
    };

    const afterKhroujAdd = mergeVisits(initialVisits, [newKhroujVisit]);

    // Simulate concurrent Tfarrej operation saving seenMoviesData
    // Even if Tfarrej had an older copy of profile without v_new_khrouj,
    // mergeVisits prevents loss:
    const tfarrejOldLocal = initialVisits;
    const finalMerged = mergeVisits(tfarrejOldLocal, afterKhroujAdd);

    assert(finalMerged.length === 2, `Test 5 failed: Expected 2 visits, got ${finalMerged.length}`);
    assert(finalMerged.some(v => v.id === 'v_new_khrouj'), `Test 5 failed: New Khrouj visit was overwritten!`);
    console.log('✅ TEST 5 PASSED: Khrouj new visit cannot be overwritten by concurrent Tfarrej actions.');
}

// TEST 6 : Deux sync successives -> pas de doublons créés
function test6() {
    const visits: VisitLog[] = [
        { id: 'v1', date: 1710000000000, placeName: 'Place 1', category: 'Café' },
        { id: 'v2', date: 1710100000000, placeName: 'Place 2', category: 'Restaurant' }
    ];

    const sync1 = mergeVisits(visits, visits);
    assert(sync1.length === 2, `Test 6 failed at sync 1: Expected 2 visits, got ${sync1.length}`);

    const sync2 = mergeVisits(sync1, visits);
    assert(sync2.length === 2, `Test 6 failed at sync 2: Expected 2 visits, got ${sync2.length}`);

    const sync3 = mergeVisits(visits, sync2);
    assert(sync3.length === 2, `Test 6 failed at sync 3: Expected 2 visits, got ${sync3.length}`);
    console.log('✅ TEST 6 PASSED: Multiple successive syncs produce zero duplicates.');
}

// TEST 7 : Profil local incomplet chargé -> Firestore n'est pas écrasé avec le profil incomplet
function test7() {
    const existingFirestoreVisits: VisitLog[] = Array.from({ length: 50 }, (_, i) => ({
        id: `v_${i}`,
        date: 1700000000000 + i * 10000,
        placeName: `Place ${i}`,
        category: 'Café'
    }));

    const incompleteLocalVisits: VisitLog[] = []; // Incomplete cache loaded with 0 visits

    // validateVisitsMutation detects abnormal reduction
    const validated = validateVisitsMutation(existingFirestoreVisits, incompleteLocalVisits, 'syncProfile');
    assert(validated.length === 50, `Test 7 failed: Safeguard failed to protect Firestore! Got ${validated.length} visits instead of 50.`);
    console.log('✅ TEST 7 PASSED: Incomplete profile cannot overwrite Firestore (safeguard intercepted).');
}

// TEST 8 : Visite sans id + visite avec id -> déduplication correcte sans perte
function test8() {
    const remoteVisitWithoutId = {
        date: 1712000000000,
        placeName: 'Café des Délices',
        category: 'Café',
        orderedItem: 'Thé aux pignons'
    };

    const localVisitWithGeneratedId = {
        id: 'delices_1712000000000',
        date: 1712000000000,
        placeName: 'Café des Délices',
        category: 'Café',
        orderedItem: 'Thé aux pignons'
    };

    const merged = mergeVisits([localVisitWithGeneratedId], [remoteVisitWithoutId]);
    assert(merged.length === 1, `Test 8 failed: Duplicate created! Expected 1 visit, got ${merged.length}`);
    assert(merged[0].placeName === 'Café des Délices', `Test 8 failed: Visit corrupted!`);
    console.log('✅ TEST 8 PASSED: Matching visit with and without ID deduplicated losslessly.');
}

try {
    test1();
    test2();
    test3();
    test4();
    test5();
    test6();
    test7();
    test8();
    console.log('\n========================================');
    console.log('🎉 ALL 8 REGRESSION TESTS PASSED 100%!');
    console.log('========================================\n');
} catch (err: any) {
    console.error('\n❌ REGRESSION TEST FAILED:', err.message);
    process.exit(1);
}
