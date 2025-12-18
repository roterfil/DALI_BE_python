import { useState, useEffect, useRef } from 'react';
import { locationService } from '../services';
import LocationPicker from './LocationPicker';
import './LocationPicker.css';

// --- ENHANCED CUSTOM DROPDOWN (Handles Objects) ---
const CustomSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled, 
  valueKey,   // e.g., 'province_id'
  labelKey    // e.g., 'province_name'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Find the full object that matches the current selected ID
  const selectedOption = options.find(opt => opt[valueKey] === parseInt(value) || opt[valueKey] === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (option) => {
    onChange(option[valueKey]); // Return just the ID
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
      <div 
        className={`custom-select-header ${isOpen ? 'is-open' : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "selected-text" : "placeholder-text"}>
          {selectedOption ? selectedOption[labelKey] : placeholder}
        </span>
        <div className="arrow-icon"></div>
      </div>

      {isOpen && (
        <div className="custom-select-list">
          {options.length > 0 ? (
            options.map((option) => (
              <div 
                key={option[valueKey]} 
                className={`custom-option ${value === option[valueKey] ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option[labelKey]}
              </div>
            ))
          ) : (
            <div style={{ padding: '10px', color: '#999', textAlign: 'center', fontSize:'0.9rem' }}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN FORM ---
const AddressForm = ({
  address = null,
  onSubmit,
  onCancel,
  submitLabel = 'Save Address',
}) => {
  const [formData, setFormData] = useState({
    additional_info: '',
    province_id: '',
    city_id: '',
    barangay_id: '',
    phone_number: '',
    is_default: false,
    latitude: null,
    longitude: null,
  });
  
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helpers to get names for geocoding
  const getSelectedProvinceName = () => {
    const province = provinces.find(p => p.province_id === parseInt(formData.province_id));
    return province?.province_name || '';
  };
  
  const getSelectedCityName = () => {
    const city = cities.find(c => c.city_id === parseInt(formData.city_id));
    return city?.city_name || '';
  };
  
  const getSelectedBarangayName = () => {
    const barangay = barangays.find(b => b.barangay_id === parseInt(formData.barangay_id));
    return barangay?.barangay_name || '';
  };

  // Load Provinces
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await locationService.getProvinces();
        setProvinces(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading provinces:', err);
      }
    };
    loadProvinces();
  }, []);

  // Load Cities
  useEffect(() => {
    if (formData.province_id) {
      const loadCities = async () => {
        try {
          const data = await locationService.getCities(formData.province_id);
          setCities(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading cities:', err);
        }
      };
      loadCities();
    } else {
      setCities([]);
      setBarangays([]);
    }
  }, [formData.province_id]);

  // Load Barangays
  useEffect(() => {
    if (formData.city_id) {
      const loadBarangays = async () => {
        try {
          const data = await locationService.getBarangays(formData.city_id);
          setBarangays(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading barangays:', err);
        }
      };
      loadBarangays();
    } else {
      setBarangays([]);
    }
  }, [formData.city_id]);

  // Edit Mode
  useEffect(() => {
    if (address) {
      setFormData({
        additional_info: address.additional_info || '',
        province_id: address.province_id || '',
        city_id: address.city_id || '',
        barangay_id: address.barangay_id || '',
        phone_number: address.phone_number || '',
        is_default: address.is_default || false,
        latitude: address.latitude || null,
        longitude: address.longitude || null,
      });
    }
  }, [address]);

  // General Input Handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Reset dependent fields logic
    if (name === 'province_id') {
      setFormData((prev) => ({ ...prev, city_id: '', barangay_id: '', latitude: null, longitude: null }));
    }
    if (name === 'city_id') {
      setFormData((prev) => ({ ...prev, barangay_id: '', latitude: null, longitude: null }));
    }
    if (name === 'barangay_id') {
      setFormData((prev) => ({ ...prev, latitude: null, longitude: null }));
    }
  };

  const handleLocationChange = (lat, lng) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.latitude || !formData.longitude) {
      setError('Please pin your location on the map for accurate delivery fee calculation');
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        ...formData,
        province_id: parseInt(formData.province_id),
        city_id: parseInt(formData.city_id),
        barangay_id: parseInt(formData.barangay_id),
      };
      await onSubmit(submitData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="address-form-container">
      {onCancel && (
        <button type="button" className="address-form-cancel-btn" onClick={onCancel}>×</button>
      )}

      <form className="address-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error" style={{color: 'red', marginBottom: '15px'}}>{error}</div>}

        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="e.g., 09123456789"
            pattern="^(\+63|0)9\d{9}$"
            required
          />
        </div>

        {/* PROVINCE SELECT */}
        <div className="form-group">
          <label>Province</label>
          <CustomSelect
            options={provinces}
            value={formData.province_id}
            onChange={(val) => handleChange({ target: { name: 'province_id', value: val } })}
            placeholder="Select Province"
            valueKey="province_id"
            labelKey="province_name"
          />
        </div>

        {/* CITY SELECT */}
        <div className="form-group">
          <label>City / Municipality</label>
          <CustomSelect
            options={cities}
            value={formData.city_id}
            onChange={(val) => handleChange({ target: { name: 'city_id', value: val } })}
            placeholder="Select City"
            disabled={!formData.province_id}
            valueKey="city_id"
            labelKey="city_name"
          />
        </div>

        {/* BARANGAY SELECT */}
        <div className="form-group">
          <label>Barangay</label>
          <CustomSelect
            options={barangays}
            value={formData.barangay_id}
            onChange={(val) => handleChange({ target: { name: 'barangay_id', value: val } })}
            placeholder="Select Barangay"
            disabled={!formData.city_id}
            valueKey="barangay_id"
            labelKey="barangay_name"
          />
        </div>

        {formData.barangay_id && (
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={handleLocationChange}
              provinceName={getSelectedProvinceName()}
              cityName={getSelectedCityName()}
              barangayName={getSelectedBarangayName()}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="additional_info">Street Address / Additional Info</label>
          <input
            type="text"
            id="additional_info"
            name="additional_info"
            value={formData.additional_info}
            onChange={handleChange}
            placeholder="House No., Street Name, Building"
            required
          />
        </div>

        <div className="form-group-checkbox" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
          <input
            type="checkbox"
            id="is_default"
            name="is_default"
            checked={formData.is_default}
            onChange={handleChange}
            style={{ width: '18px', height: '18px', accentColor: '#be1e72' }}
          />
          <label htmlFor="is_default" style={{ margin: 0, fontWeight: 400 }}>Set as default address</label>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', backgroundColor: '#be1e72', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          disabled={loading || !formData.latitude}
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </form>
    </div>
  );
};

export default AddressForm;