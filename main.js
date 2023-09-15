
window.onload = () => {
  console.log('main.js');

/////////////////////////////////////////

const parseResponse = (res) => {
  return JSON.parse(res.startsWith('svdata=') ? res.substring(7) : res);
}

const vm = new Vue ({
  el: '#deck',

  data: {
    slot_items: '',
    port: '',
    mapinfo: '',
    base_area: 0,
    result: '',
    inputErrors: {
      slot_items: '',
      port: '',
      mapinfo: '',
    },
    message: '',
    gaze_info: ''
  },

  created() {
    if(localStorage && localStorage.getItem('slot_items')) {
      this.slot_items = localStorage.getItem('slot_items'); 
      document.getElementById('slot_items_label').classList.add('active');
      this.validateInput('slot_items');
    }
  },

  methods: {
    validateInput(key) {
      console.log('validateInput(' + key + ')');
      if(this[key] === '') {
        this.inputErrors[key] = '';
        this.inputErrors['result'] = '';
        if(key != 'mapinfo') return;
        else this.gaze_info = ''
      }
      else {
        try {
          const res = parseResponse(this[key]);
          this.inputErrors[key] = 'valid';

          if(key == 'slot_items' && localStorage) {
            localStorage.setItem('slot_items', this.slot_items);
          }
          else if(key == 'mapinfo') {
            try {
              const tmp = res.api_data.api_map_info.slice(-1)[0].api_eventmap;
              console.log(tmp)
              this.gaze_info = tmp.api_now_maphp + ' / ' +  tmp.api_max_maphp;
            } catch (e) {
              consoler.log(e);
              this.gaze_info = '';
            }
          }
        } catch (e) {
          console.log(e);
          this.inputErrors[key] = e instanceof SyntaxError ? 'invalid' : '';
          this.inputErrors['result'] = '';
          this.result = '';
          if(key == 'mapinfo') this.gaze_info = '';
          return;
        }
      }
      this.updateResult();
    },

    updateResult(e = null) {
      console.log('update');
      if (
        this.inputErrors['port'] !== 'valid' ||
        this.inputErrors['slot_items'] !== 'valid' ||
        this.inputErrors['mapinfo'] === 'invalid') {
        this.result = '';
        return;
      }

      try {

        let items = parseResponse(this.slot_items).api_data;
        if(items.api_slot_item) items = items.api_slot_item;
        items = Object.fromEntries(items.map(s => [s.api_id, s]));

        const port = parseResponse(this.port).api_data;
        const ships = Object.fromEntries(port.api_ship.map(s => [s.api_id,s]));

        const base = this.mapinfo == '' ? [] : parseResponse(this.mapinfo).api_data.api_air_base;

        const item_json = (id) => {
          if(id == null || id <= 0) return null;

          item = items[id]
          const result = {
            id: item["api_slotitem_id"],
            rf: item["api_level"],
          }
          if(item["api_alv"] != null) result['mas'] = item["api_alv"] 
          return result
        }

        const base_area = (e ? e.target.value : this.base_area) | 0;

        const builder_data = Object.fromEntries(
          [
            ['version', 4],
            ['hqlv', port['api_basic']['api_level']]
          ].concat(

            port["api_deck_port"].map((d, i) =>
              [`f${i + 1}`, Object.fromEntries(d['api_ship'].map((s, i) => {
                if(s <= 0) return null;
                ship = ships[s];
                return [`s${i + 1}`, {
                  id: ship['api_ship_id'],
                  lv: ship['api_lv'], 
                  luck: ship['api_lucky'][0], 
                  hp: ship['api_maxhp'],
                  taisen: ship['api_taisen'][0],
                  items: Object.fromEntries(
                    ship['api_slot'].map((s, i) => {
                      if(s < 0) return null;
                      return [`i${i + 1}`, item_json(s)]
                    }).concat(
                      [ship['api_slot_ex'] > 0 ? ['ix', item_json(ship['api_slot_ex'])] : null]
                    ).filter(x => x)
                  )
                }]
              }).filter(x => x))]
            )
          ).concat(

            base.filter(a => { return base_area ? a['api_area_id'] == (base_area | 0) : (a['api_area_id'] >= 10)}).map((a, i) =>
              [`a${i + 1}`, {
                mode: a['api_action_kind'],
                items: Object.fromEntries(a['api_plane_info'].map((s, i) => {
                  s = s['api_slotid']
                  if(s <= 0) return null;
                  return [`i${i + 1}`, item_json(s)]
                }).filter(x => x))
              }]
            )
          ).filter(x => x)
        );
        this.result = JSON.stringify(builder_data);
        this.message = '';
        document.getElementById('result_label').classList.add('active');  

      } catch(e) {
        console.log(e); 
        this.message = '変換に失敗しました';
        this.result = '';
      }
    },

    copy: () => {
      document.getElementById('result').select();
      document.execCommand('copy');
    },

    open_airsim: () => {
      const result = document.querySelector('#result').value.replace(/\s/g, '')
      window.open('https://noro6.github.io/kc-web?predeck=' + result, '_blank');
    }
  }
});

};

