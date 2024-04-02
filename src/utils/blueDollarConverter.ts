import axios from "axios";

export async function convertARStoUSDC(arsAmount: number): Promise<number> {
  const response = await axios.get("https://api.bluelytics.com.ar/v2/latest");
  const usdToArsRate = response.data.blue.value_sell;
  const usdcValue = arsAmount / usdToArsRate;
  return usdcValue;
}
