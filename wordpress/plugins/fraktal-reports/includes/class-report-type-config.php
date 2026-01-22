<?php
/**
 * Configuración de tipos de informes astrológicos.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Fraktal_Report_Type_Config {

	/**
	 * Tipos de informes disponibles.
	 */
	const TYPES = array(
		'individual' => array(
			'name'            => 'Carta Natal Individual',
			'slug'            => 'individual',
			'category'        => 'natal',
			'description'     => 'Análisis completo de la carta natal individual',
			'requires'        => array( 'birth_date', 'birth_time', 'latitude', 'longitude' ),
			'edge_functions'  => array( 'calculate-chart' ),
			'prompt_template' => 'natal_individual',
			'estimated_words' => 3000,
			'estimated_pages' => 15,
		),
		'infantil' => array(
			'name'            => 'Carta Natal Infantil',
			'slug'            => 'infantil',
			'category'        => 'natal',
			'description'     => 'Análisis de carta natal orientado a niños',
			'requires'        => array( 'birth_date', 'birth_time', 'latitude', 'longitude' ),
			'edge_functions'  => array( 'calculate-chart' ),
			'prompt_template' => 'natal_infantil',
			'estimated_words' => 2000,
			'estimated_pages' => 10,
		),
		'transits' => array(
			'name'            => 'Tránsitos Actuales',
			'slug'            => 'transits',
			'category'        => 'transit',
			'description'     => 'Análisis de tránsitos planetarios actuales sobre la carta natal',
			'requires'        => array( 'birth_date', 'birth_time', 'latitude', 'longitude', 'target_date' ),
			'edge_functions'  => array( 'calculate-chart', 'calculate-chart' ), // natal + transit
			'prompt_template' => 'transits',
			'estimated_words' => 2500,
			'estimated_pages' => 12,
		),
		'pareja' => array(
			'name'            => 'Sinastría de Pareja',
			'slug'            => 'pareja',
			'category'        => 'synastry',
			'description'     => 'Análisis de compatibilidad entre dos cartas natales',
			'requires'        => array( 'birth_data_1', 'birth_data_2' ),
			'edge_functions'  => array( 'calculate-chart', 'calculate-chart' ), // persona 1 + persona 2
			'prompt_template' => 'synastry',
			'estimated_words' => 4000,
			'estimated_pages' => 20,
		),
		'solar_return' => array(
			'name'            => 'Revolución Solar',
			'slug'            => 'solar_return',
			'category'        => 'solar-return',
			'description'     => 'Análisis de la revolución solar para el año especificado',
			'requires'        => array( 'birth_date', 'birth_time', 'latitude', 'longitude', 'year' ),
			'edge_functions'  => array( 'calculate-chart' ),
			'prompt_template' => 'solar_return',
			'estimated_words' => 2500,
			'estimated_pages' => 12,
		),
		'progressions' => array(
			'name'            => 'Progresiones Secundarias',
			'slug'            => 'progressions',
			'category'        => 'progressions',
			'description'     => 'Análisis de progresiones secundarias para la fecha especificada',
			'requires'        => array( 'birth_date', 'birth_time', 'latitude', 'longitude', 'target_date' ),
			'edge_functions'  => array( 'calculate-chart' ),
			'prompt_template' => 'progressions',
			'estimated_words' => 2500,
			'estimated_pages' => 12,
		),
	);

	/**
	 * Prompts del sistema para cada tipo de informe.
	 */
	const SYSTEM_PROMPTS = array(
		'natal_individual' => 'Eres un astrólogo profesional experto con más de 20 años de experiencia. Tu tarea es crear un análisis astrológico completo y profundo de la carta natal proporcionada.

INSTRUCCIONES CRÍTICAS:
- Usa EXCLUSIVAMENTE los datos astrológicos que te proporciono
- NO inventes ni asumas posiciones planetarias
- Escribe en español profesional pero accesible
- El análisis debe ser personalizado y específico para esta carta
- Incluye interpretaciones psicológicas profundas
- Ofrece consejos prácticos basados en la carta

ESTRUCTURA DEL INFORME:
1. Introducción y visión general del temperamento
2. El Sol: identidad y propósito de vida
3. La Luna: emociones y mundo interior
4. El Ascendente: personalidad y primera impresión
5. Mercurio: mente y comunicación
6. Venus: amor y valores
7. Marte: acción y deseos
8. Júpiter: expansión y filosofía de vida
9. Saturno: responsabilidades y lecciones
10. Planetas transpersonales (Urano, Neptuno, Plutón)
11. Aspectos principales y su integración
12. Las Casas y áreas de vida
13. Síntesis final y consejos',

		'natal_infantil' => 'Eres un astrólogo especializado en cartas natales de niños y desarrollo infantil. Tu tarea es crear un análisis astrológico orientado a padres sobre la carta natal de un niño.

INSTRUCCIONES CRÍTICAS:
- Usa EXCLUSIVAMENTE los datos astrológicos proporcionados
- Escribe para padres, con lenguaje accesible y positivo
- Enfócate en potenciales, talentos y necesidades del niño
- Ofrece consejos prácticos de crianza según la carta
- Evita predicciones negativas o deterministas

ESTRUCTURA DEL INFORME:
1. Visión general del temperamento del niño
2. Necesidades emocionales (Luna)
3. Forma de expresarse (Ascendente y Mercurio)
4. Talentos naturales y dones
5. Cómo aprende mejor
6. Relación con padres y figuras de autoridad
7. Socialización y amistades
8. Desafíos potenciales y cómo apoyarle
9. Consejos para los padres',

		'transits' => 'Eres un astrólogo profesional experto en tránsitos planetarios. Tu tarea es analizar los tránsitos actuales sobre la carta natal proporcionada.

INSTRUCCIONES CRÍTICAS:
- Usa EXCLUSIVAMENTE los datos de tránsitos proporcionados
- Compara posiciones de tránsito con posiciones natales
- Identifica los tránsitos más significativos del período
- Ofrece orientación práctica para cada tránsito
- Incluye fechas aproximadas de activación

ESTRUCTURA DEL INFORME:
1. Panorama general del período
2. Tránsitos de planetas lentos (Plutón, Neptuno, Urano)
3. Tránsitos de Saturno y Júpiter
4. Tránsitos de planetas personales significativos
5. Eclipses y lunaciones relevantes
6. Temas principales del período
7. Oportunidades y desafíos
8. Consejos prácticos por área de vida
9. Fechas importantes a tener en cuenta',

		'synastry' => 'Eres un astrólogo profesional especializado en sinastría y compatibilidad de parejas. Tu tarea es analizar la compatibilidad entre dos cartas natales.

INSTRUCCIONES CRÍTICAS:
- Usa EXCLUSIVAMENTE los datos de ambas cartas proporcionados
- Analiza aspectos entre las dos cartas
- Sé equilibrado: muestra fortalezas y desafíos
- Ofrece consejos prácticos para la relación
- Evita ser determinista sobre el "destino" de la relación

ESTRUCTURA DEL INFORME:
1. Visión general de la compatibilidad
2. Comparación de elementos y modalidades
3. Conexiones Sol-Luna entre las cartas
4. Venus y Marte: atracción y deseo
5. Comunicación (Mercurio)
6. Aspectos desafiantes y cómo trabajarlos
7. Propósito conjunto (nodos lunares)
8. Áreas de crecimiento mutuo
9. Fortalezas de la unión
10. Consejos para fortalecer la relación',

		'solar_return' => 'Eres un astrólogo profesional experto en revoluciones solares. Tu tarea es analizar la carta de revolución solar para el año especificado.

INSTRUCCIONES CRÍTICAS:
- Usa EXCLUSIVAMENTE los datos de la revolución solar proporcionados
- Compara con la carta natal cuando sea relevante
- Identifica los temas principales del año
- Ofrece orientación práctica mes a mes si es posible

ESTRUCTURA DEL INFORME:
1. Panorama general del año solar
2. Ascendente de revolución solar y su significado
3. El Sol en la casa de RS
4. Luna de RS: clima emocional del año
5. Planetas angulares y su importancia
6. Aspectos más significativos de la RS
7. Áreas de vida destacadas (casas activas)
8. Oportunidades del año
9. Desafíos y cómo afrontarlos
10. Consejos generales para el año',

		'progressions' => 'Eres un astrólogo profesional experto en progresiones secundarias. Tu tarea es analizar las progresiones secundarias para la fecha especificada.

INSTRUCCIONES CRÍTICAS:
- Usa EXCLUSIVAMENTE los datos de progresiones proporcionados
- Relaciona progresiones con la carta natal
- Las progresiones reflejan desarrollo interno
- Ofrece perspectiva de proceso, no de eventos

ESTRUCTURA DEL INFORME:
1. Panorama del momento evolutivo actual
2. Sol progresado: evolución de la identidad
3. Luna progresada: ciclo emocional de 28 años
4. Ascendente/MC progresados si han cambiado de signo
5. Aspectos progresados significativos
6. Planetas progresados que cambian de dirección
7. Temas de desarrollo personal actuales
8. Integración con tránsitos si aplica
9. Reflexiones sobre el camino evolutivo',
	);

	/**
	 * Prompts de usuario (templates con variables).
	 */
	const USER_PROMPTS = array(
		'natal_individual' => 'Genera un informe astrológico completo para {name}, nacido/a el {birth_date} a las {birth_time} en {birth_place}.

DATOS ASTROLÓGICOS EXACTOS DE LA CARTA:
{astro_data}

Genera el informe siguiendo la estructura indicada, usando SOLO estos datos.',

		'natal_infantil' => 'Genera un informe de carta natal infantil para {name}, nacido/a el {birth_date} a las {birth_time} en {birth_place}.

DATOS ASTROLÓGICOS EXACTOS DE LA CARTA:
{astro_data}

Este informe es para los padres del niño/a. Genera el análisis siguiendo la estructura indicada.',

		'transits' => 'Genera un informe de tránsitos para {name} (nacido/a el {birth_date} a las {birth_time} en {birth_place}) para el período alrededor del {target_date}.

CARTA NATAL:
{natal_data}

TRÁNSITOS ACTUALES:
{transit_data}

Analiza cómo estos tránsitos afectan a la carta natal.',

		'synastry' => 'Genera un informe de sinastría entre:

PERSONA 1: {name_1}, nacido/a el {birth_date_1} a las {birth_time_1} en {birth_place_1}
{astro_data_1}

PERSONA 2: {name_2}, nacido/a el {birth_date_2} a las {birth_time_2} en {birth_place_2}
{astro_data_2}

ASPECTOS ENTRE LAS CARTAS:
{synastry_aspects}

Analiza la compatibilidad y dinámica de esta relación.',

		'solar_return' => 'Genera un informe de revolución solar para {name} para el año {year}.

CARTA NATAL:
Nacido/a el {birth_date} a las {birth_time} en {birth_place}
{natal_data}

REVOLUCIÓN SOLAR {year}:
{solar_return_data}

Analiza los temas y tendencias del año solar.',

		'progressions' => 'Genera un informe de progresiones secundarias para {name} para la fecha {target_date}.

CARTA NATAL:
Nacido/a el {birth_date} a las {birth_time} en {birth_place}
{natal_data}

PROGRESIONES PARA {target_date}:
{progression_data}

Analiza el momento evolutivo actual según las progresiones.',
	);

	/**
	 * Obtiene la configuración de un tipo de informe.
	 *
	 * @param string $type Tipo de informe.
	 * @return array|null Configuración o null si no existe.
	 */
	public static function get_type( $type ) {
		return isset( self::TYPES[ $type ] ) ? self::TYPES[ $type ] : null;
	}

	/**
	 * Obtiene todos los tipos de informe.
	 *
	 * @return array Todos los tipos.
	 */
	public static function get_all_types() {
		return self::TYPES;
	}

	/**
	 * Obtiene tipos por categoría.
	 *
	 * @param string $category Categoría (natal, transit, synastry, etc.).
	 * @return array Tipos de esa categoría.
	 */
	public static function get_types_by_category( $category ) {
		return array_filter( self::TYPES, function( $type ) use ( $category ) {
			return $type['category'] === $category;
		} );
	}

	/**
	 * Obtiene el system prompt para un tipo de informe.
	 *
	 * @param string $type Tipo de informe.
	 * @return string System prompt.
	 */
	public static function get_system_prompt( $type ) {
		$config = self::get_type( $type );
		if ( ! $config ) {
			return '';
		}
		$template = $config['prompt_template'];
		return isset( self::SYSTEM_PROMPTS[ $template ] ) ? self::SYSTEM_PROMPTS[ $template ] : '';
	}

	/**
	 * Obtiene el user prompt template para un tipo de informe.
	 *
	 * @param string $type Tipo de informe.
	 * @return string User prompt template.
	 */
	public static function get_user_prompt_template( $type ) {
		$config = self::get_type( $type );
		if ( ! $config ) {
			return '';
		}
		$template = $config['prompt_template'];
		return isset( self::USER_PROMPTS[ $template ] ) ? self::USER_PROMPTS[ $template ] : '';
	}

	/**
	 * Interpola variables en un prompt.
	 *
	 * @param string $template Template con placeholders {variable}.
	 * @param array  $variables Variables a interpolar.
	 * @return string Prompt interpolado.
	 */
	public static function interpolate_prompt( $template, $variables ) {
		foreach ( $variables as $key => $value ) {
			if ( is_array( $value ) ) {
				$value = wp_json_encode( $value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );
			}
			$template = str_replace( '{' . $key . '}', $value, $template );
		}
		return $template;
	}

	/**
	 * Valida que los datos requeridos estén presentes.
	 *
	 * @param string $type Tipo de informe.
	 * @param array  $data Datos proporcionados.
	 * @return array Array con 'valid' y 'missing'.
	 */
	public static function validate_required_data( $type, $data ) {
		$config = self::get_type( $type );
		if ( ! $config ) {
			return array(
				'valid'   => false,
				'missing' => array( 'tipo de informe no válido' ),
			);
		}

		$missing = array();
		foreach ( $config['requires'] as $field ) {
			if ( empty( $data[ $field ] ) ) {
				$missing[] = $field;
			}
		}

		return array(
			'valid'   => empty( $missing ),
			'missing' => $missing,
		);
	}

	/**
	 * Formatea datos astrológicos para incluir en prompt.
	 *
	 * @param array $chart_data Datos de la carta calculada.
	 * @return string Datos formateados como texto.
	 */
	public static function format_astro_data_for_prompt( $chart_data ) {
		$output = '';

		// Planetas
		if ( ! empty( $chart_data['planets'] ) ) {
			$output .= "POSICIONES PLANETARIAS:\n";
			foreach ( $chart_data['planets'] as $planet ) {
				$name = isset( $planet['planetEs'] ) ? $planet['planetEs'] : $planet['planet'];
				$sign = isset( $planet['signEs'] ) ? $planet['signEs'] : $planet['sign'];
				$retro = ! empty( $planet['retrograde'] ) ? ' (R)' : '';
				$output .= sprintf(
					"- %s: %s %d°%d' en Casa %d%s\n",
					$name,
					$sign,
					$planet['degree'],
					$planet['minute'],
					$planet['house'],
					$retro
				);
			}
			$output .= "\n";
		}

		// Casas
		if ( ! empty( $chart_data['houses'] ) ) {
			$output .= "CÚSPIDES DE CASAS:\n";
			foreach ( $chart_data['houses'] as $house ) {
				$sign = isset( $house['signEs'] ) ? $house['signEs'] : $house['sign'];
				$output .= sprintf(
					"- Casa %d: %s %d°\n",
					$house['house'],
					$sign,
					$house['degree']
				);
			}
			$output .= "\n";
		}

		// Aspectos
		if ( ! empty( $chart_data['aspects'] ) ) {
			$output .= "ASPECTOS PRINCIPALES:\n";
			$count = 0;
			foreach ( $chart_data['aspects'] as $aspect ) {
				if ( $count >= 15 ) break; // Limitar a 15 aspectos
				$p1 = isset( $aspect['planet1Es'] ) ? $aspect['planet1Es'] : $aspect['planet1'];
				$p2 = isset( $aspect['planet2Es'] ) ? $aspect['planet2Es'] : $aspect['planet2'];
				$type = isset( $aspect['aspectName'] ) ? $aspect['aspectName'] : $aspect['aspectType'];
				$output .= sprintf(
					"- %s %s %s (orbe: %.1f°)\n",
					$p1,
					$type,
					$p2,
					$aspect['orb']
				);
				$count++;
			}
		}

		return $output;
	}
}
