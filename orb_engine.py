from pymongo import MongoClient
import math
from typing import Dict, List, Optional, Any

class OrbEngine:
    """
    Motor de Orbes y Lógica de Negocio Astrológica (Core Fractal).
    Encargado de la precisión técnica, corrección de casas y validación de aspectos.
    """
    def __init__(self, db_connection_string: str, db_name: str):
        self.client = MongoClient(db_connection_string)
        self.db = self.client[db_name]
        self.collection = self.db['calculation_rules']

    def get_effective_config(self, report_type: str = "NATAL", user_prefs: Optional[Dict] = None) -> Dict:
        """
        Tarea 1.2: Carga la configuración base y la fusiona con las preferencias del usuario.
        """
        # 1. Cargar Configuración Base ("Default") para el tipo de reporte
        doc = self.collection.find_one(
            {"presets.type": report_type},
            {"presets.$": 1}
        )
        
        base_config = {}
        if doc and 'presets' in doc:
            base_config = doc['presets'][0]
        
        if not user_prefs:
            return base_config

        # 2. Fusión Dinámica (Override de Usuario)
        effective_config = base_config.copy()
        
        # Sobrescribir lógica de casas
        if 'logicSettings' in user_prefs:
            effective_config.setdefault('rules', {})
            effective_config['rules'].update(user_prefs.get('logicSettings', {}))

        # Sobrescribir orbes por cuerpo
        if 'orbs' in user_prefs:
            # Convertimos la lista de orbes de la base a un mapa para fácil acceso si es necesario,
            # o simplemente actualizamos si el usuario provee un mapa directo.
            current_orbs = {item['body']: item for item in effective_config.get('orbs', [])}
            for body, overrides in user_prefs['orbs'].items():
                if body in current_orbs:
                    current_orbs[body].update(overrides)
                else:
                    overrides['body'] = body
                    current_orbs[body] = overrides
            effective_config['orbs'] = list(current_orbs.values())

        # Filtrar cuerpos activos (Tarea 2.4)
        if 'activeBodies' in user_prefs:
            active_list = user_prefs['activeBodies']
            effective_config['orbs'] = [o for o in effective_config.get('orbs', []) if o['body'] in active_list]

        return effective_config

    def calculate_house_placement(self, planet_degree: float, house_cusps: List[float], config: Dict) -> Dict:
        """
        Tarea 1.3: Corrección de Casas por Proximidad (Regla de los 5 grados / Parametrizada).
        Retorna: { houseNumber: N, isCorrected: boolean, note: str }
        """
        rules = config.get('rules', {}).get('houseCorrection', {})
        if not rules.get('enabled', False):
            geom_house = self.get_geometric_house_index(planet_degree, house_cusps) + 1
            return {
                "houseNumber": geom_house,
                "isCorrected": False,
                "note": f"Ubicación geométrica estándar en Casa {geom_house}. Corrección desactivada."
            }

        # 1. Identificar casa geométrica
        current_idx = self.get_geometric_house_index(planet_degree, house_cusps)
        next_idx = (current_idx + 1) % 12
        next_cusp = house_cusps[next_idx]
        
        # 2. Calcular distancia a la siguiente cúspide
        distance = self.angular_distance(planet_degree, next_cusp)
        
        # 3. Determinar umbral según el tipo de casa (Angular vs Resto)
        is_next_angular = (next_idx + 1) in [1, 4, 7, 10]
        threshold = rules.get('angularOrb', 2.0) if is_next_angular else rules.get('otherOrb', 1.0)
        
        # 4. Condición de salto
        if distance <= threshold:
            corrected_house = next_idx + 1
            return {
                "houseNumber": corrected_house,
                "isCorrected": True,
                "note": f"Movido a Casa {corrected_house} por proximidad a cúspide ({distance:.2f}° <= {threshold}°)."
            }
        else:
            final_house = current_idx + 1
            return {
                "houseNumber": final_house,
                "isCorrected": False,
                "note": f"Permanencia en Casa {final_house}. Distancia a cúspide ({distance:.2f}°) superior al umbral ({threshold}°)."
            }

    def validate_aspect(self, body_a: str, body_b: str, angle: float, config: Dict) -> Dict:
        """
        Tarea 1.4: Validación con Efecto Paraguas vs Prioridad Receptor.
        Retorna: { isValid: bool, orb: float, note: str, aspectType: str }
        """
        aspect_rules = config.get('rules', {}).get('aspects', {})
        orbs_data = {item['body']: item for item in config.get('orbs', [])}
        
        # Identificar tipo de aspecto
        aspect_type = self.get_aspect_type(angle)
        if not aspect_type:
            return {"isValid": False, "orb": 0, "note": "Sin aspecto detectado fuera de rango genérico.", "aspectType": None}

        exact_angle = self.get_exact_angle_for_aspect(aspect_type)
        current_orb = abs(angle - exact_angle)

        # Caso TRÁNSITOS (RECEIVER_PRIORITY): El planeta B es el receptor natal
        if aspect_rules.get('strategy') == 'RECEIVER_PRIORITY':
            limit = orbs_data.get(body_b, {}).get(aspect_type, 0)
            strategy_name = "Prioridad Receptor (Natal)"
        # Caso NATAL/SINASTRÍA (UMBRELLA_MAX): Inclusión máxima
        else:
            orb_a = orbs_data.get(body_a, {}).get(aspect_type, 0)
            orb_b = orbs_data.get(body_b, {}).get(aspect_type, 0)
            limit = max(orb_a, orb_b)
            strategy_name = "Efecto Paraguas (Max Orb)"

        is_valid = current_orb <= limit
        status = "VÁLIDO" if is_valid else "FUERA DE ORBE"
        
        return {
            "isValid": is_valid,
            "orb": round(current_orb, 2),
            "limit": limit,
            "aspectType": aspect_type,
            "note": f"Aspecto {aspect_type} {status} ({current_orb:.2f}° <= {limit}°). Estrategia: {strategy_name}."
        }

    # --- Utilidades Matemáticas ---
    def angular_distance(self, a: float, b: float) -> float:
        d = abs(a - b) % 360
        return d if d < 180 else 360 - d

    def get_geometric_house_index(self, pos: float, cusps: List[float]) -> int:
        for i in range(12):
            c1 = cusps[i]
            c2 = cusps[(i + 1) % 12]
            if c1 <= c2:
                if c1 <= pos < c2: return i
            else:
                if pos >= c1 or pos < c2: return i
        return 0

    def get_aspect_type(self, angle: float) -> Optional[str]:
        # Rangos aproximados para identificación inicial antes de validar el orbe preciso
        # Basado en la Matriz de Orbes v6.0 (puntos 36-39 del prompt)
        # Se usa un margen de 12° para la detección inicial de luminares
        margins = {
            "conjunction": 0,
            "opposition": 180,
            "square": 90,
            "trine": 120,
            "sextile": 60
        }
        for name, exact in margins.items():
            if abs(angle - exact) <= 12: 
                return name
        return None

    def get_exact_angle_for_aspect(self, aspect_type: str) -> float:
        return {
            "conjunction": 0,
            "opposition": 180,
            "square": 90,
            "trine": 120,
            "sextile": 60
        }.get(aspect_type, 0)
