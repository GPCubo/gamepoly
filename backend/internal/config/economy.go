package config

import "math"

const (
	PriceMin              = 60
	PriceMax              = 400
	HouseCostMin          = 50
	HouseCostMax          = 200
	HotelCostMultiplier   = 4
	MortgageRate          = 0.5
	UnmortgageInterest    = 0.1
	HotelRentMultiplier   = 50
)

var HouseRentMultipliers = []int{1, 5, 12, 25, 40}

func RoundToStep(value float64, step float64) int {
	return int(math.Round(value/step) * step)
}

func priceRatio(price int) float64 {
	if PriceMax == PriceMin {
		return 0
	}
	ratio := float64(price-PriceMin) / float64(PriceMax-PriceMin)
	if ratio < 0 {
		return 0
	}
	if ratio > 1 {
		return 1
	}
	return ratio
}

func HouseCostForPrice(price int) int {
	return RoundToStep(float64(HouseCostMin)+priceRatio(price)*float64(HouseCostMax-HouseCostMin), 10)
}

func HotelCostForPrice(price int) int {
	return RoundToStep(float64(HouseCostForPrice(price)*HotelCostMultiplier), 10)
}

func RentBaseForPrice(price int) int {
	return int(math.Round(float64(price) * 0.1))
}

func RentForDevelopment(price, houses int, hasHotel bool) int {
	base := RentBaseForPrice(price)
	if hasHotel {
		return base * HotelRentMultiplier
	}
	level := houses
	if level < 0 {
		level = 0
	}
	if level >= len(HouseRentMultipliers) {
		level = len(HouseRentMultipliers) - 1
	}
	return base * HouseRentMultipliers[level]
}

func MortgageValueForPrice(price int) int {
	return RoundToStep(float64(price)*MortgageRate, 10)
}

func UnmortgageCostForPrice(price int) int {
	return RoundToStep(float64(MortgageValueForPrice(price))*(1+UnmortgageInterest), 10)
}

// RailroadRent returns rent based on number of railroads owned by landlord.
func RailroadRent(ownedCount int) int {
	switch ownedCount {
	case 1:
		return 25
	case 2:
		return 50
	case 3:
		return 100
	case 4:
		return 200
	default:
		return 0
	}
}

// UtilityRent returns rent based on number of utilities owned and dice total.
func UtilityRent(ownedCount, diceTotal int) int {
	if ownedCount >= 2 {
		return diceTotal * 10
	}
	return diceTotal * 4
}
