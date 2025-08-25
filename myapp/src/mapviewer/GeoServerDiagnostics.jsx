// GeoServerDiagnostics.js - Tool to diagnose GeoServer connectivity issues

export class GeoServerDiagnostics {
  constructor(geoserverUrl, layerName) {
    this.geoserverUrl = geoserverUrl;
    this.layerName = layerName;
    this.baseUrl = geoserverUrl.replace(/\/wms.*$/, '');
  }

  async runDiagnostics() {
    console.log('🔍 Running GeoServer Diagnostics...');
    console.log('📍 GeoServer URL:', this.geoserverUrl);
    console.log('🗂️ Layer Name:', this.layerName);
    
    const results = {
      geoserverConnectivity: false,
      wmsCapabilities: false,
      wfsCapabilities: false,
      layerExists: false,
      corsEnabled: false,
      wmsUrlTest: false,
      wfsUrlTest: false,
      recommendations: []
    };

    // Test 1: Basic GeoServer connectivity
    try {
      await this.testGeoServerConnectivity();
      results.geoserverConnectivity = true;
      console.log('✅ GeoServer connectivity: OK');
    } catch (error) {
      console.log('❌ GeoServer connectivity: FAILED', error.message);
      results.recommendations.push('Check if GeoServer is running and accessible');
    }

    // Test 2: WMS Capabilities
    try {
      const wmsCapabilities = await this.testWMSCapabilities();
      results.wmsCapabilities = true;
      results.layerExists = this.checkLayerInCapabilities(wmsCapabilities);
      console.log('✅ WMS Capabilities: OK');
      console.log(results.layerExists ? '✅ Layer found in WMS' : '❌ Layer NOT found in WMS');
    } catch (error) {
      console.log('❌ WMS Capabilities: FAILED', error.message);
      results.recommendations.push('Check WMS service configuration');
    }

    // Test 3: WFS Capabilities
    try {
      const wfsCapabilities = await this.testWFSCapabilities();
      results.wfsCapabilities = true;
      console.log('✅ WFS Capabilities: OK');
    } catch (error) {
      console.log('❌ WFS Capabilities: FAILED', error.message);
      if (error.message.includes('CORS')) {
        results.recommendations.push('Configure CORS settings in GeoServer');
      }
    }

    // Test 4: CORS Test
    try {
      await this.testCORS();
      results.corsEnabled = true;
      console.log('✅ CORS: Enabled');
    } catch (error) {
      console.log('❌ CORS: Blocked', error.message);
      results.recommendations.push('Enable CORS in GeoServer web.xml or use a proxy');
    }

    // Test 5: WMS URL Test
    try {
      await this.testWMSUrl();
      results.wmsUrlTest = true;
      console.log('✅ WMS URL Test: OK');
    } catch (error) {
      console.log('❌ WMS URL Test: FAILED', error.message);
      results.recommendations.push('Check layer name and WMS configuration');
    }

    // Test 6: WFS URL Test
    try {
      await this.testWFSUrl();
      results.wfsUrlTest = true;
      console.log('✅ WFS URL Test: OK');
    } catch (error) {
      console.log('❌ WFS URL Test: FAILED', error.message);
    }

    // Generate recommendations
    this.generateRecommendations(results);
    
    return results;
  }

  async testGeoServerConnectivity() {
    const testUrl = `${this.baseUrl}/web/`;
    const response = await fetch(testUrl, { 
      method: 'HEAD', 
      mode: 'no-cors' // This will succeed if server is reachable
    });
    return true; // If we get here, server is reachable
  }

  async testWMSCapabilities() {
    const capabilitiesUrl = `${this.baseUrl}/wms?service=WMS&version=1.1.1&request=GetCapabilities`;
    console.log('Testing WMS Capabilities URL:', capabilitiesUrl);
    
    const response = await fetch(capabilitiesUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    return text;
  }

  async testWFSCapabilities() {
    const capabilitiesUrl = `${this.baseUrl}/wfs?service=WFS&version=2.0.0&request=GetCapabilities`;
    console.log('Testing WFS Capabilities URL:', capabilitiesUrl);
    
    try {
      const response = await fetch(capabilitiesUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('CORS policy blocks WFS capabilities request');
      }
      throw error;
    }
  }

  checkLayerInCapabilities(capabilities) {
    return capabilities.toLowerCase().includes(`<name>${this.layerName}</name>`) ||
           capabilities.toLowerCase().includes(`<name>${this.layerName.toLowerCase()}</name>`);
  }

  async testCORS() {
    const corsTestUrl = `${this.baseUrl}/wfs?service=WFS&version=2.0.0&request=GetCapabilities`;
    
    try {
      const response = await fetch(corsTestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      if (error.message.includes('CORS') || error.name === 'TypeError') {
        throw new Error('CORS blocked');
      }
      throw error;
    }
  }

  async testWMSUrl() {
    const wmsUrl = `${this.baseUrl}/wms`;
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetMap',
      LAYERS: this.layerName,
      STYLES: '',
      BBOX: '-180,-90,180,90',
      WIDTH: '256',
      HEIGHT: '256',
      SRS: 'EPSG:4326',
      FORMAT: 'image/png',
      TRANSPARENT: 'true'
    });
    
    const fullUrl = `${wmsUrl}?${params.toString()}`;
    console.log('Testing WMS GetMap URL:', fullUrl);
    
    const response = await fetch(fullUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return true;
  }

  async testWFSUrl() {
    const wfsUrl = `${this.baseUrl}/wfs`;
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typename: this.layerName,
      outputFormat: 'application/json',
      maxFeatures: '1'
    });
    
    const fullUrl = `${wfsUrl}?${params.toString()}`;
    console.log('Testing WFS GetFeature URL:', fullUrl);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return true;
  }

  generateRecommendations(results) {
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('=' .repeat(50));
    
    if (!results.geoserverConnectivity) {
      console.log('🔧 GeoServer appears to be unreachable');
      console.log('   - Check if GeoServer is running');
      console.log('   - Verify the URL is correct');
      console.log('   - Check network connectivity');
    }
    
    if (!results.layerExists) {
      console.log('🔧 Layer not found in GeoServer');
      console.log('   - Verify layer name spelling');
      console.log('   - Check if layer is published');
      console.log('   - Ensure workspace is correct');
    }
    
    if (!results.corsEnabled) {
      console.log('🔧 CORS is blocking requests');
      console.log('   - Add CORS configuration to GeoServer web.xml:');
      console.log(`      <filter>
        <filter-name>CorsFilter</filter-name>
        <filter-class>org.apache.catalina.filters.CorsFilter</filter-class>
        <init-param>
          <param-name>cors.allowed.origins</param-name>
          <param-value>http://localhost:5173</param-value>
        </init-param>
      </filter>
      <filter-mapping>
        <filter-name>CorsFilter</filter-name>
        <url-pattern>/*</url-pattern>
      </filter-mapping>`);
    }
    
    if (results.wmsCapabilities && !results.wmsUrlTest) {
      console.log('🔧 WMS service works but layer request fails');
      console.log('   - Double-check layer name');
      console.log('   - Verify layer permissions');
      console.log('   - Check layer styling');
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    results.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    if (results.recommendations.length === 0) {
      console.log('   🎉 All tests passed! Layer should load correctly.');
    }
  }
}

// Usage example:
// const diagnostics = new GeoServerDiagnostics('http://192.168.29.246:8080/geoserver/dB78EgUNUWMPrvn20V8F1xRu1/wms', 'in');
// diagnostics.runDiagnostics();