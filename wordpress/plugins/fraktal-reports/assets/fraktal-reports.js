(function($){
  function el(html){ return $(html); }

  function normalizeDate(input){
    const s = String(input || '').trim();
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // dd/mm/yyyy
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m){
      const dd = String(m[1]).padStart(2,'0');
      const mm = String(m[2]).padStart(2,'0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return s;
  }

  function normalizeTime(input){
    const s = String(input || '').trim();
    // "8:02" -> "08:02"
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return String(m[1]).padStart(2,'0') + ':' + m[2];
    return s;
  }

  function parseCoord(input){
    // Acepta "37.1212", "37,1212", "37.1212° N", "5.4542° W"
    let s = String(input || '').trim().toUpperCase();
    s = s.replace(',', '.');
    const num = s.match(/[-+]?\d+(?:\.\d+)?/);
    if (!num) return null;
    let v = parseFloat(num[0]);
    if (s.includes('S') || s.includes('W')) v = -Math.abs(v);
    if (s.includes('N') || s.includes('E')) v = Math.abs(v);
    return v;
  }

  function api(action, data){
    return $.ajax({
      url: FraktalReports.ajaxUrl,
      method: 'POST',
      dataType: 'json',
      data: Object.assign({ action: action, nonce: FraktalReports.nonce }, data || {}),
    });
  }

  function renderProfiles(profiles){
    const root = $('#fraktal-profiles');
    root.empty();
    if (!profiles.length){
      root.append(el('<p>No hay perfiles aún.</p>'));
      return;
    }
    profiles.forEach((p, idx) => {
      const card = el('<div class="fraktal-card"></div>');
      card.append(el('<div class="fraktal-row"></div>')
        .append(field('Nombre', 'name', p.name || ('Perfil ' + (idx+1)), idx))
        .append(field('Lugar', 'birth_place', p.birth_place || '', idx))
      );
      card.append(el('<div class="fraktal-row"></div>')
        .append(field('Fecha', 'birth_date', p.birth_date || '', idx))
        .append(field('Hora', 'birth_time', p.birth_time || '', idx))
      );
      card.append(el('<div class="fraktal-row"></div>')
        .append(field('Zona horaria', 'zona_horaria', p.zona_horaria || 'Europe/Madrid', idx))
        .append(el('<div></div>'))
      );
      card.append(el('<div class="fraktal-row"></div>')
        .append(field('Latitud', 'latitude', p.latitude || '', idx))
        .append(field('Longitud', 'longitude', p.longitude || '', idx))
      );
      const actions = el('<div class="fraktal-actions"></div>');
      actions.append(el('<button class="button">Eliminar</button>').on('click', async () => {
        if (!confirm('¿Eliminar perfil?')) return;
        profiles.splice(idx,1);
        await saveProfiles(profiles);
        renderProfiles(profiles);
        renderGenerate(profiles);
      }));
      card.append(actions);
      root.append(card);
    });
  }

  function field(label, key, value, idx){
    const wrap = el('<div></div>');
    wrap.append(el('<label></label>').text(label));
    wrap.append(el('<input/>').val(value).on('input', function(){
      wrap.trigger('fraktal-field-change', { idx, key, value: $(this).val() });
    }));
    return wrap;
  }

  async function loadProfiles(){
    const res = await api('fraktal_reports_profiles_get', {});
    if (!res.success) throw new Error(res.data?.message || 'Error cargando perfiles');
    return res.data.profiles || [];
  }

  async function saveProfiles(profiles){
    const res = await api('fraktal_reports_profiles_save', { profiles: JSON.stringify(profiles) });
    if (!res.success) throw new Error(res.data?.message || 'Error guardando perfiles');
    return true;
  }

  async function listReports(){
    const res = await api('fraktal_reports_list', {});
    if (!res.success) throw new Error(res.data?.message || 'Error listando informes');
    return res.data.sessions || [];
  }

  function renderReports(sessions){
    const root = $('#fraktal-reports-list');
    root.empty();
    if (!sessions.length){
      root.append(el('<p>No hay informes aún.</p>'));
      return;
    }
    sessions.forEach((s) => {
      const card = el('<div class="fraktal-card"></div>');
      const st = (s.status || '').toLowerCase();
      const badge = el('<span class="fraktal-badge"></span>');
      if (st === 'completed') badge.addClass('ok').text('COMPLETADO');
      else if (st === 'error') badge.addClass('err').text('ERROR');
      else badge.addClass('wait').text(st || 'IN_PROGRESS');

      card.append(el('<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"></div>')
        .append(el('<div><strong>Informe</strong><div style="font-size:12px;color:#6b7280"></div></div>')
          .find('div').last().text(s.created_at || '').end())
        .append(badge)
      );
      const dl = el('<a class="button button-primary" style="margin-top:10px;display:inline-block">Descargar PDF</a>');
      dl.attr('href', FraktalReports.downloadUrl + '&session_id=' + encodeURIComponent(s.session_id) + '&nonce=' + encodeURIComponent(FraktalReports.nonce));
      dl.prop('disabled', st !== 'completed');
      if (st !== 'completed') dl.css({opacity:0.6, pointerEvents:'none'});
      card.append(dl);
      root.append(card);
    });
  }

  function renderGenerate(profiles){
    const root = $('#fraktal-generate');
    root.empty();
    if (!profiles.length){
      root.append(el('<p>Primero crea un perfil.</p>'));
      return;
    }
    const canGen = root.data('fraktal-can-generate') === 1 || root.data('fraktal-can-generate') === '1';
    if (!canGen){
      root.append(el('<p><strong>No tienes acceso para generar informes.</strong> Compra el Informe Individual primero.</p>'));
      return;
    }
    const sel = el('<select></select>');
    profiles.forEach((p, idx) => {
      sel.append(el('<option></option>').attr('value', idx).text(p.name || ('Perfil ' + (idx+1))));
    });

    const btn = el('<button class="button button-primary">Generar informe (exhaustivo)</button>');
    const info = el('<p class="description">El sistema generará el informe completo en background. Puedes cerrar la pestaña y volver luego a “Mis informes”.</p>');
    root.append(sel).append(btn).append(info);

    btn.on('click', async () => {
      const idx = parseInt(sel.val(), 10);
      const p = profiles[idx];
      const birthDate = normalizeDate(p?.birth_date);
      const birthTime = normalizeTime(p?.birth_time);
      const lat = parseCoord(p?.latitude);
      const lon = parseCoord(p?.longitude);

      if (!p || !birthDate || !birthTime || lat === null || lon === null){
        alert('Completa fecha, hora, latitud y longitud. Ejemplos: fecha 1972-05-27 o 27/05/1972; lat 37.1212; lon -5.4542 (o con N/S/E/W).');
        return;
      }
      btn.prop('disabled', true).text('Generando...');
      $('#fraktal-progress').html('Iniciando generación...');
      try {
        // 1) generar carta_data (endpoint público del backend)
        // Nota: no usamos secret en browser. /charts/generate es público en el backend actual.
        const API_URL = (FraktalReports.apiUrl || '').replace(/\/$/, '');
        if (!API_URL) throw new Error('Configura la API URL en Ajustes > Fraktal Reports.');
        const cartaResp = await fetch(API_URL + '/charts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.name || 'Consultante',
            birth_date: birthDate,
            birth_time: birthTime,
            birth_place: p.birth_place || '',
            latitude: String(lat),
            longitude: String(lon),
            is_demo: true
          })
        });
        if (!cartaResp.ok) throw new Error('Error generando carta');
        const cartaData = await cartaResp.json();

        // 2) encolar informe completo vía WP (server-side HMAC)
        const payload = {
          email: '',
          display_name: p.name || '',
          nombre: p.name || '',
          report_mode: 'full',
          carta_data: cartaData
        };
        const start = await api('fraktal_reports_start', { payload: JSON.stringify(payload) });
        if (!start.success) throw new Error(start.data?.message || 'Error iniciando informe');
        const session_id = start.data.session_id;
        $('#fraktal-progress').html('Sesión creada: <code>' + session_id + '</code><br/>Iniciando polling...');
        pollStatus(session_id);
      } catch (e){
        console.error(e);
        alert(e.message || 'Error');
        $('#fraktal-progress').html('Error: ' + (e.message || ''));
      } finally {
        btn.prop('disabled', false).text('Generar informe (exhaustivo)');
      }
    });
  }

  async function pollStatus(sessionId){
    let done = false;
    while(!done){
      try {
        const res = await api('fraktal_reports_status', { session_id: sessionId });
        if (!res.success) throw new Error(res.data?.message || 'Error status');
        const st = res.data.status;
        const modTitle = res.data.current_module_title || '';
        const idx = res.data.current_module_index || 0;
        const total = res.data.total_modules || 0;
        $('#fraktal-progress').html(
          '<div><strong>Estado:</strong> ' + st + '</div>' +
          '<div><strong>Módulo:</strong> ' + (idx+1) + '/' + total + ' — ' + modTitle + '</div>'
        );
        if (st === 'completed' || st === 'error'){
          done = true;
          const sessions = await listReports();
          renderReports(sessions);
          break;
        }
      } catch (e){
        console.error(e);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  $(async function(){
    const panel = $('[data-fraktal-panel="1"]');
    if (!panel.length) return;

    // Tabs
    panel.on('click', '.fraktal-tab', function(){
      const tab = $(this).data('tab');
      panel.find('.fraktal-tab').removeClass('is-active');
      $(this).addClass('is-active');
      panel.find('.fraktal-tab-content').removeClass('is-active');
      panel.find('.fraktal-tab-content[data-content="'+tab+'"]').addClass('is-active');
    });

    // Cargar perfiles y reports
    let profiles = await loadProfiles();
    renderProfiles(profiles);
    renderGenerate(profiles);

    $('#fraktal-profiles').on('fraktal-field-change', function(_, ev){
      const { idx, key, value } = ev;
      profiles[idx][key] = value;
    });

    $('#fraktal-add-profile').on('click', async function(){
      profiles.push({ name: 'Nuevo perfil', birth_date:'', birth_time:'', birth_place:'', latitude:'', longitude:'', zona_horaria:'Europe/Madrid' });
      await saveProfiles(profiles);
      renderProfiles(profiles);
      renderGenerate(profiles);
    });

    // Persistir cuando se cambia de tab
    panel.on('click', '.fraktal-tab', async function(){
      try { await saveProfiles(profiles); } catch(e){ console.error(e); }
      if ($(this).data('tab') === 'reports'){
        try {
          const sessions = await listReports();
          renderReports(sessions);
        } catch(e){
          $('#fraktal-reports-list').html('<p>Error listando informes.</p>');
        }
      }
    });

    // Exponer API_URL en JS para /charts/generate (público)
    // (Se pasa por wp_localize_script como FraktalReports.apiUrl)
  });
})(jQuery);


