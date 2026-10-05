<?php
/**
 * IA de matching offre ↔ candidat.
 * Pondération : compétences 45 %, diplôme 25 %, expérience 20 %, personnalité (bonus) jusqu'à 10 %.
 */

function normalize_text(string $s): string
{
    $s = mb_strtolower(trim($s));
    $s = strtr($s, ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i',
                    'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', '’' => "'"]);
    return preg_replace('/[^a-z0-9 ]+/', ' ', $s);
}

function keywords(string $s): array
{
    $stop = ['de', 'des', 'du', 'la', 'le', 'les', 'en', 'et', 'd', 'l', 'a', 'au', 'aux', 'un', 'une', 'ou', 'sciences', 'diplome', 'licence', 'master'];
    return array_values(array_unique(array_filter(explode(' ', normalize_text($s)), fn($w) => strlen($w) > 2 && !in_array($w, $stop, true))));
}

function similar_terms(string $a, string $b): bool
{
    $a = normalize_text($a);
    $b = normalize_text($b);
    if ($a === '' || $b === '') return false;
    if ($a === $b || str_contains($a, $b) || str_contains($b, $a)) return true;
    $ka = keywords($a);
    $kb = keywords($b);
    if (!$ka || !$kb) return false;
    return count(array_intersect($ka, $kb)) / min(count($ka), count($kb)) >= 0.6;
}

function match_score(array $offre, array $cand): array
{
    // 1. Compétences (45)
    $req = array_filter(array_map('trim', explode(',', (string)$offre['competences_requises'])));
    $candComps = array_column($cand['competences'], 'nom');
    $matched = [];
    if ($req) {
        foreach ($req as $rc) {
            foreach ($candComps as $cc) {
                if (similar_terms($rc, $cc)) { $matched[] = $rc; break; }
            }
        }
        $sComp = 45 * count($matched) / count($req);
    } else {
        $sComp = 45 * min(1, count($candComps) / 5);
    }

    // 2. Diplôme (25)
    $sDip = 0;
    $dipLabel = null;
    if ($cand['diplomes']) {
        if (empty($offre['diplome_requis'])) {
            $sDip = 25;
        } else {
            $best = 0;
            $kReq = keywords($offre['diplome_requis']);
            foreach ($cand['diplomes'] as $d) {
                if (similar_terms($offre['diplome_requis'], $d['intitule'])) { $best = 1; $dipLabel = $d['intitule']; break; }
                $kD = keywords($d['intitule']);
                if ($kReq && $kD) {
                    $ratio = count(array_intersect($kReq, $kD)) / count($kReq);
                    if ($ratio > $best) { $best = $ratio; $dipLabel = $d['intitule']; }
                }
            }
            $sDip = 25 * max(0.2, $best); // un diplôme paramédical vaut au moins 20 % du critère
        }
    }

    // 3. Expérience (20)
    $exp = $cand['experience_annees'];
    $min = (int)$offre['experience_min'];
    $sExp = $min <= 0 ? 20 : 20 * min(1, $exp / $min);

    // 4. Personnalité (bonus jusqu'à 10)
    $sPers = 0;
    if ($cand['test']) {
        $t = $cand['test'];
        $sPers = 10 * (($t['conscience'] + $t['agreabilite'] + $t['stabilite'] + $t['adaptation_medicale']) / 400);
    }

    $total = (int)round(min(100, $sComp + $sDip + $sExp + $sPers));
    return [
        'total' => $total,
        'competences' => round($sComp, 1),
        'diplome' => round($sDip, 1),
        'experience' => round($sExp, 1),
        'personnalite' => round($sPers, 1),
        'competences_matchees' => $matched,
        'diplome_retenu' => $dipLabel,
    ];
}

/** Top N candidats pour une offre (même poste que l'offre) */
function suggestions_pour_offre(array $offre, int $limit = 5): array
{
    $ids = array_column(db_all('SELECT id FROM candidats WHERE poste_recherche = ?', [$offre['titre']]), 'id');
    $res = [];
    foreach ($ids as $id) {
        $c = candidat_full((int)$id);
        $c['score'] = match_score($offre, $c);
        $res[] = $c;
    }
    usort($res, fn($a, $b) => $b['score']['total'] <=> $a['score']['total']);
    return array_slice($res, 0, $limit);
}
