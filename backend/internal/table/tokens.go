package table

var defaultTokenModels = []string{
	"sombrero.glb",
	"dedal.glb",
	"coffee.glb",
	"soccer_ball.glb",
}

func normalizeTokenModel(model string, slotIndex int) string {
	for _, candidate := range defaultTokenModels {
		if model == candidate {
			return model
		}
	}

	if len(defaultTokenModels) == 0 {
		return "sombrero.glb"
	}
	if slotIndex < 0 {
		slotIndex = 0
	}
	return defaultTokenModels[slotIndex%len(defaultTokenModels)]
}

func isValidTokenModel(model string) bool {
	for _, candidate := range defaultTokenModels {
		if model == candidate {
			return true
		}
	}
	return false
}

func isOpenPlayerName(name string) bool {
	return name == "" || name == "open"
}

func chooseTokenModel(model string, slotIndex int, used map[string]bool) (string, error) {
	if isValidTokenModel(model) {
		if used[model] {
			return "", errTokenAlreadyUsed
		}
		return model, nil
	}
	if model != "" {
		return "", errInvalidTokenModel
	}

	if len(defaultTokenModels) == 0 {
		return "", errInvalidTokenModel
	}
	if slotIndex < 0 {
		slotIndex = 0
	}
	for offset := 0; offset < len(defaultTokenModels); offset++ {
		candidate := defaultTokenModels[(slotIndex+offset)%len(defaultTokenModels)]
		if !used[candidate] {
			return candidate, nil
		}
	}
	return "", errTokenAlreadyUsed
}
