<?php
require_once __DIR__.'/../../config.inc.php';
use TPGwidget\Data\{Lines, Stops};

include '../../tpgdata/vehicules/vehicules.php';

if (!isset($_GET['id'])) { // Si aucun arrêt spécifié
    die("Erreur : Aucun d&eacute;part sp&eacute;cifi&eacute;");
}

//$file = 'http://prod.ivtr-od.tpg.ch/v1/GetThermometer.xml?key='.getenv('TPG_API_KEY').'&departureCode=' . $_GET["id"];
//$thermometer = @simplexml_load_file($file);

// Fall Back To Old API - This marks the final moments of TPGw and Third Party TPG Open Data Apps
$thermometer = json_decode(file_get_contents("https://preview.genav.ch/api/getThermometer.json?departureCode=" . $_GET["id"]))->thermometer;

if (!$thermometer) { ?>
    <div class="navbar">
        <div class="navbar-inner">
            <div class="left">
                <a href="#" class="back link icon-only">
                    <i class="icon icon-back"></i>
                </a>
            </div>
            <div class="center sliding">Erreur</div>
            <div class="right">
                <a href="#" class="open-panel link icon-only"><i class="icon icon-panel"></i></a>
            </div>
        </div>
    </div>
    <div class="pages">
        <div data-page="error" class="page">
            <div class="page-content">
                <div class="content-block">
                    <p>
                        Impossible de contacter les serveurs TPG
                    </p>
                </div>
            </div>
        </div>
    </div>
<?php } else {
    $nextDeps = json_decode(file_get_contents("https://preview.genav.ch/api/getNextDepartures.json?stopCode=" . $thermometer->stop->stopCode))->nextDepartures;
    $departureData = [
        "ligne"=>"",
        "vehiculeNo"=>""
    ];
    foreach ($nextDeps->departures as $prochainDepart) {
        if (($prochainDepart->departureCode??"") == $_GET['id']) {
            $departureData = [
                "ligne"=>$prochainDepart->connection->lineCode,
                "vehiculeNo"=>$prochainDepart->vehiculeNo
            ];
            break;
        }
    }
$line = Lines::get($departureData['ligne']);
$color = $line['background'];
?>
<div class="navbar">
    <div class="navbar-inner">
        <div class="left">
            <a href="#" class="back link icon-only">
                <i class="icon icon-back"></i>
            </a>
        </div>
        <div class="center sliding" <?= $line['text'] === '#000000' ? 'style="color: #000"' : '' ?>>
            <span class="lineCode <?= $line['text'] === '#000000' ? 'b' : '' ?>">
                <?= $departureData['ligne'] ?></span> → <?= Stops::format($thermometer->destinationName ?? '') ?>
            </span>
        </div>
        <div class="right">
            <a href="#" class="open-panel link icon-only"><i class="icon icon-panel"></i></a>
        </div>
        <div class="subnavbar sliding">
            <div class="buttons-row buttons-row-colored <?= $line['text'] === '#000000' ? 'buttons-row-colored-light' : '' ?>">
                <a href="#" role="button" class="button show-m active">Temps</a>
                <a href="#" role="button" class="button show-h">Heure</a>
                <span class="buttons-row-indicator" role="presentation"></span>
            </div>
        </div>
    </div>
</div>
<div class="pages">
    <div data-page="depart-<?= $line['background'] ?><?= $line['text'] === '#000000' ? '-b' : '' ?>" class="page page-depart with-subnavbar">
        <div class="page-content">

            <div class="content-block" style="margin: 10px;"></div>

            <?php
            $vehicleNo = filter_input(INPUT_GET, 'vehicleNo', FILTER_VALIDATE_INT); // Sometimes, GetNextDepartures provides a vehicle number while GetThermometer doesn’t
            if (isset($departureData['vehicleNo']) || $vehicleNo) {
                $vehicule = new Vehicule($departureData['vehicleNo'] ?? $vehicleNo); // Afficher véhicule
                $vehicule->renderCard_iOS();
            }
            ?>

            <div class="card">
                <div class="card-content">
                    <div class="list-block parcours">
                        <ul>
                            <?php $avancee = 'previous';
                            $translations = [
                                "PNEF"=>"PNEV",
                                "CRCD"=>"CRCO",
                            ];
                            foreach ($thermometer->steps as $step) {
                                if (array_key_exists($step->stop->stopCode, $translations))
                                    $step->stop->stopCode = $translations[$step->stop->stopCode];
                                ?>
                                <li>
                                    <?php
                                    // TODO: Could be replaced with a simple call to $step->visible
                                    if ($avancee == "current") {
                                        $avancee = "";
                                    }

                                    if (levenshtein($thermometer->stop->stopName, $step->stop->stopName) == 0) {
                                        $avancee = 'current';
                                    }
                                    // ENDTODO
                                    ?>
                                    <a href="/ajax/page/<?= $step->stop->stopCode ?>/<?= rawurlencode(str_replace('/', '_', $step->stop->stopName ?? '')) ?>" class="item-link item-content <?= $avancee ?>">
                                        <div class="item-media">
                                            <i class="t icon l<?=str_replace('+', '', $departureData['ligne']) ?>"></i>
                                        </div>
                                        <div class="item-inner">
                                            <div class="item-title"><?= Stops::format($step->stop->stopName ?? '') ?></div>
                                            <div class="item-after">
                                                <span class="h"><?= date('H:i', strtotime($step->timestamp)) ?></span>
                                                <span class="m">
                                                    <?php if (intval($step->arrivalTime)) {
                                                        echo $step->arrivalTime." min";
                                                    } ?>
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                </li>
                            <?php } ?>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <?php if (is_array($thermometer->deviation)) { ?>
            <div class="disruptions-data">
                <?php
                $disruptions = [];
                foreach ($thermometer->deviation as $disruption) {
                    $disruptions[] = $disruption;
                }
                echo json_encode($disruptions);
                ?>
            </div>
        <?php } ?>
    </div>
</div>
<?php }
