<?php
/**
 * Clase para sincronización de usuarios WordPress con Supabase.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Fraktal_Supabase_Auth {

	/**
	 * Cliente de Supabase.
	 *
	 * @var Fraktal_Supabase_Client
	 */
	private $client;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->client = new Fraktal_Supabase_Client();
	}

	/**
	 * Sincroniza un usuario de WordPress con Supabase.
	 * Crea el perfil si no existe, o lo actualiza si ya existe.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @return array|WP_Error Datos del perfil o error.
	 */
	public function sync_wp_user( $wp_user_id ) {
		$wp_user = get_userdata( $wp_user_id );
		if ( ! $wp_user ) {
			return new WP_Error( 'invalid_user', 'Usuario de WordPress no encontrado.' );
		}

		// Verificar si ya existe en Supabase
		$existing = $this->get_profile_by_wp_id( $wp_user_id );

		if ( is_wp_error( $existing ) ) {
			// No existe, crear nuevo perfil
			return $this->create_profile( $wp_user_id, $wp_user->user_email, $wp_user->display_name );
		}

		// Existe, actualizar datos si han cambiado
		return $this->update_profile( $existing['id'], array(
			'email'      => $wp_user->user_email,
			'first_name' => $wp_user->first_name ?: $wp_user->display_name,
			'last_name'  => $wp_user->last_name ?: '',
			'updated_at' => current_time( 'mysql', true ),
		) );
	}

	/**
	 * Obtiene el perfil de Supabase por wp_user_id.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @return array|WP_Error Datos del perfil o error.
	 */
	public function get_profile_by_wp_id( $wp_user_id ) {
		$endpoint = $this->client->build_query(
			'profiles',
			array( 'wp_user_id' => 'eq.' . intval( $wp_user_id ) ),
			array( 'limit' => 1 )
		);

		$result = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( empty( $result ) || ! is_array( $result ) ) {
			return new WP_Error( 'not_found', 'Perfil no encontrado en Supabase.' );
		}

		return $result[0];
	}

	/**
	 * Obtiene el ID de Supabase para un usuario de WordPress.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @return string|null UUID del usuario en Supabase o null.
	 */
	public function get_supabase_user_id( $wp_user_id ) {
		// Primero intentar desde cache local
		$cached = get_user_meta( $wp_user_id, 'supabase_user_id', true );
		if ( $cached ) {
			return $cached;
		}

		// Buscar en Supabase
		$profile = $this->get_profile_by_wp_id( $wp_user_id );
		if ( ! is_wp_error( $profile ) && isset( $profile['id'] ) ) {
			// Guardar en cache local
			update_user_meta( $wp_user_id, 'supabase_user_id', $profile['id'] );
			return $profile['id'];
		}

		return null;
	}

	/**
	 * Crea un nuevo perfil en Supabase para un usuario de WordPress.
	 *
	 * @param int    $wp_user_id ID del usuario en WordPress.
	 * @param string $email Email del usuario.
	 * @param string $name Nombre del usuario.
	 * @return array|WP_Error Datos del perfil creado o error.
	 */
	public function create_profile( $wp_user_id, $email, $name ) {
		$wp_user = get_userdata( $wp_user_id );

		$data = array(
			'wp_user_id'        => intval( $wp_user_id ),
			'email'             => sanitize_email( $email ),
			'first_name'        => sanitize_text_field( $wp_user ? $wp_user->first_name : $name ),
			'last_name'         => sanitize_text_field( $wp_user ? $wp_user->last_name : '' ),
			'subscription_tier' => $this->get_wp_subscription_tier( $wp_user_id ),
			'created_at'        => current_time( 'mysql', true ),
			'updated_at'        => current_time( 'mysql', true ),
		);

		$result = $this->client->use_service_role()->post(
			'rest/v1/profiles',
			$data,
			array( 'Prefer' => 'return=representation' )
		);

		if ( ! is_wp_error( $result ) && isset( $result[0]['id'] ) ) {
			// Guardar referencia en WordPress
			update_user_meta( $wp_user_id, 'supabase_user_id', $result[0]['id'] );
			return $result[0];
		}

		return $result;
	}

	/**
	 * Actualiza un perfil existente en Supabase.
	 *
	 * @param string $supabase_id UUID del perfil en Supabase.
	 * @param array  $data Datos a actualizar.
	 * @return array|WP_Error Datos actualizados o error.
	 */
	public function update_profile( $supabase_id, $data ) {
		$endpoint = 'rest/v1/profiles?id=eq.' . $supabase_id;

		return $this->client->use_service_role()->patch(
			$endpoint,
			$data,
			array( 'Prefer' => 'return=representation' )
		);
	}

	/**
	 * Verifica si un usuario de WordPress ya tiene perfil en Supabase.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @return bool True si existe, false si no.
	 */
	public function user_exists( $wp_user_id ) {
		$profile = $this->get_profile_by_wp_id( $wp_user_id );
		return ! is_wp_error( $profile );
	}

	/**
	 * Obtiene el tier de suscripción del usuario desde WordPress/WooCommerce.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @return string Tier de suscripción (free, premium, enterprise).
	 */
	private function get_wp_subscription_tier( $wp_user_id ) {
		// Si existe DA_Plan_Manager, usarlo
		if ( class_exists( 'DA_Plan_Manager' ) ) {
			return DA_Plan_Manager::get_user_plan( $wp_user_id );
		}

		// Fallback: verificar roles de WordPress
		$user = get_userdata( $wp_user_id );
		if ( $user && in_array( 'administrator', (array) $user->roles, true ) ) {
			return 'enterprise';
		}

		return 'free';
	}

	/**
	 * Sincroniza el tier de suscripción de WP a Supabase.
	 *
	 * @param int    $wp_user_id ID del usuario en WordPress.
	 * @param string $tier Nuevo tier de suscripción.
	 * @return array|WP_Error Resultado de la actualización.
	 */
	public function sync_subscription_tier( $wp_user_id, $tier ) {
		$supabase_id = $this->get_supabase_user_id( $wp_user_id );
		if ( ! $supabase_id ) {
			// Crear perfil si no existe
			$profile = $this->sync_wp_user( $wp_user_id );
			if ( is_wp_error( $profile ) ) {
				return $profile;
			}
			$supabase_id = $profile['id'];
		}

		return $this->update_profile( $supabase_id, array(
			'subscription_tier' => sanitize_text_field( $tier ),
			'updated_at'        => current_time( 'mysql', true ),
		) );
	}
}
